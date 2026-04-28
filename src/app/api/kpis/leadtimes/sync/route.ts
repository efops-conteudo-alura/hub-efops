import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/kpis/leadtimes/sync
//
// Sincroniza tasks de 3 listas do ClickUp e calcula leadtime em dias.
// Usa /task/{id}/time_in_status para extrair timestamps de cada status.
// Sync incremental: tasks com date_updated inalterado desde o último sync são ignoradas.
// Listas ALURA: filtra tasks com campo "Origem do Curso" = "Reaproveitado".

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;

interface ListConfig {
  listId: string;
  costCenter: "ALURA" | "LATAM";
  filterReaproveitado: boolean;
  startStatus: string;
  endStatus: string;
  gravStartStatus?: string;
  gravEndStatus?: string;
  skipStatuses?: string[];
}

const LIST_CONFIGS: ListConfig[] = [
  {
    listId: "901311315105",
    costCenter: "ALURA",
    filterReaproveitado: true,
    startStatus: "2. em planejamento",
    endStatus: "9. publicado",
  },
  {
    listId: "901319822968",
    costCenter: "ALURA",
    filterReaproveitado: true,
    startStatus: "3. ementa",
    endStatus: "11. publicado",
    skipStatuses: ["2. alinhamento de briefing"],
  },
  {
    listId: "901303695381",
    costCenter: "LATAM",
    filterReaproveitado: false,
    startStatus: "estruturacao das aulas",
    endStatus: "publicado/finalizado",
    gravStartStatus: "gravacao",
    gravEndStatus: "revisao",
  },
];

// Normaliza o nome de um status para comparação:
// lowercase, remove acentos, colapsa espaços, normaliza espaços ao redor de "/"
function canonicalizeStatus(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ");
}

interface ClickUpCustomFieldOption {
  id: string;
  name: string;
  orderindex: number;
}

interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config?: { options?: ClickUpCustomFieldOption[] };
  value: unknown;
}

function isOrigemReaproveitado(customFields: ClickUpCustomField[]): boolean {
  if (!Array.isArray(customFields)) return false;

  const field = customFields.find((f) => {
    const n = canonicalizeStatus(f.name);
    return n.includes("origem") && n.includes("curso");
  });

  if (!field || field.value === null || field.value === undefined) return false;

  const resolveValue = (): string => {
    const v = field.value;
    if (typeof v === "object" && v !== null) {
      const obj = v as Record<string, unknown>;
      if (typeof obj.name === "string") return obj.name;
    }
    // drop_down: value = orderindex number → resolve via type_config.options
    if ((typeof v === "number" || typeof v === "string") && field.type_config?.options) {
      const idx = Number(v);
      const opt = field.type_config.options.find((o) => o.orderindex === idx);
      if (opt) return opt.name;
    }
    return String(v);
  };

  return canonicalizeStatus(resolveValue()).includes("reaproveitado");
}

interface ClickUpTaskListItem {
  id: string;
  name: string;
  date_updated: string | null;
  status: { status: string };
  custom_fields?: ClickUpCustomField[];
}

interface ClickUpTimeInStatusEntry {
  status: string;
  total_time?: { since?: string | number; by_minute?: number };
}

interface ClickUpTimeInStatus {
  current_status?: ClickUpTimeInStatusEntry;
  status_history?: ClickUpTimeInStatusEntry[];
}

const MAX_PAGES = 30;

async function fetchListTasks(listId: string): Promise<ClickUpTaskListItem[]> {
  const tasks: ClickUpTaskListItem[] = [];
  let page = 0;

  while (page < MAX_PAGES) {
    const url = `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=false&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: CLICKUP_API_KEY } });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Lista ${listId} p.${page} → ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const pageTasks: ClickUpTaskListItem[] = data.tasks ?? [];
    tasks.push(...pageTasks);

    if (data.last_page === true || pageTasks.length === 0) break;
    page++;
  }

  return tasks;
}

// Retorna Map<statusCanonicalizado, epochMs> com os timestamps de entrada em cada status.
async function fetchTimeInStatus(taskId: string): Promise<Map<string, number> | null> {
  const url = `https://api.clickup.com/api/v2/task/${taskId}/time_in_status`;
  const res = await fetch(url, { headers: { Authorization: CLICKUP_API_KEY } });

  if (!res.ok) {
    console.warn(`[leadtimes sync] task ${taskId} time_in_status → ${res.status}`);
    return null;
  }

  const data: ClickUpTimeInStatus = await res.json();
  const map = new Map<string, number>();

  const addEntry = (entry: ClickUpTimeInStatusEntry) => {
    const key = canonicalizeStatus(entry.status);
    const ts = Number(entry.total_time?.since);
    if (Number.isFinite(ts) && ts > 0 && !map.has(key)) {
      map.set(key, ts);
    }
  };

  if (data.current_status) addEntry(data.current_status);
  for (const entry of data.status_history ?? []) addEntry(entry);

  return map;
}

function diffDias(start: number | null, end: number | null): number | null {
  if (start === null || end === null || end < start) return null;
  return Math.round(((end - start) / 86_400_000) * 100) / 100;
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CLICKUP_API_KEY) {
    return NextResponse.json({ error: "CLICKUP_API_KEY não configurada" }, { status: 500 });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let filtered = 0;
  let total = 0;
  const errors: string[] = [];
  // statusSamples: para diagnóstico — exibe os status encontrados nas primeiras tasks de cada lista
  const statusSamples: Record<string, string[]> = {};

  try {
    for (const config of LIST_CONFIGS) {
      let listTasks: ClickUpTaskListItem[];
      try {
        listTasks = await fetchListTasks(config.listId);
      } catch (err) {
        errors.push(`Lista ${config.listId}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      // Carrega tasks existentes desta lista de uma vez (evita N+1)
      const existingTasks = await prisma.leadtimeTask.findMany({
        where: { listId: config.listId },
        select: { clickupTaskId: true, clickupUpdatedAt: true },
      });
      const existingMap = new Map(existingTasks.map((t) => [t.clickupTaskId, t]));

      const listStatusSamples: string[] = [];

      for (const item of listTasks) {
        total++;

        // Filtro: ignorar tasks em backlog (nome varia por lista: "backlog", "1. backlog", etc.)
        if (canonicalizeStatus(item.status?.status ?? "").includes("backlog")) {
          filtered++;
          continue;
        }

        // Filtro: ignorar status extras configurados por lista
        if (config.skipStatuses?.some((s) => canonicalizeStatus(item.status?.status ?? "") === canonicalizeStatus(s))) {
          filtered++;
          continue;
        }

        // Filtro: só aceitar tasks cujo nome começa com exatamente 4 dígitos (ID do curso)
        if (!/^\d{4}(?!\d)/.test(item.name.trim())) {
          filtered++;
          continue;
        }

        // Filtro: ignorar tasks "Reaproveitado" nas listas Alura
        if (config.filterReaproveitado && item.custom_fields && isOrigemReaproveitado(item.custom_fields)) {
          filtered++;
          continue;
        }

        const dateUpdated = item.date_updated ? new Date(Number(item.date_updated)) : null;
        const existing = existingMap.get(item.id);

        // Sync incremental: pular tasks sem mudanças desde o último sync
        if (
          existing &&
          dateUpdated &&
          existing.clickupUpdatedAt &&
          existing.clickupUpdatedAt.getTime() === dateUpdated.getTime()
        ) {
          skipped++;
          continue;
        }

        const enterMap = await fetchTimeInStatus(item.id);
        if (!enterMap) {
          skipped++;
          continue;
        }

        // Coleta amostras de status para diagnóstico (até 30 por lista)
        if (listStatusSamples.length < 30) {
          for (const [s] of enterMap) listStatusSamples.push(s);
        }

        const firstStatusTs = enterMap.size > 0 ? Math.min(...enterMap.values()) : null;
        const startTs = enterMap.get(config.startStatus) ?? firstStatusTs ?? null;
        const endTs = enterMap.get(config.endStatus) ?? null;

        const dataInicio = startTs !== null ? new Date(startTs) : null;
        const dataConclusao = endTs !== null ? new Date(endTs) : null;
        const leadtimeDias = diffDias(startTs, endTs);

        let dataGravInicio: Date | null = null;
        let dataGravFim: Date | null = null;
        let leadtimeGravacao: number | null = null;

        if (config.costCenter === "LATAM") {
          const gravStart = config.gravStartStatus ? (enterMap.get(config.gravStartStatus) ?? null) : null;
          const gravEnd = config.gravEndStatus ? (enterMap.get(config.gravEndStatus) ?? null) : null;
          dataGravInicio = gravStart !== null ? new Date(gravStart) : null;
          dataGravFim = gravEnd !== null ? new Date(gravEnd) : null;
          leadtimeGravacao = diffDias(gravStart, gravEnd);
        }

        const data = {
          name: item.name,
          listId: config.listId,
          costCenter: config.costCenter,
          dataInicio,
          dataConclusao,
          leadtimeDias,
          dataGravInicio,
          dataGravFim,
          leadtimeGravacao,
          clickupUpdatedAt: dateUpdated,
          syncedAt: new Date(),
        };

        await prisma.leadtimeTask.upsert({
          where: { clickupTaskId: item.id },
          create: { clickupTaskId: item.id, ...data },
          update: data,
          select: { id: true },
        });

        if (existing) updated++;
        else created++;
      }

      // Deduplica amostras
      statusSamples[config.listId] = [...new Set(listStatusSamples)].sort();
    }

    return NextResponse.json({
      success: true,
      total,
      created,
      updated,
      skipped,
      filtered,
      errors: errors.length > 0 ? errors : undefined,
      statusSamples,
    });
  } catch (err) {
    console.error("[leadtimes sync]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
