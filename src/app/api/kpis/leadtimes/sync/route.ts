import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/kpis/leadtimes/sync
//
// Sincroniza tasks de 3 listas do ClickUp e calcula o leadtime em dias
// (intervalo entre o status de início e o status de conclusão).
//
// Listas mapeadas:
// - ALURA — lista 901311315105: início "2. EM PLANEJAMENTO" → fim "9. PUBLICADO"
// - ALURA — lista 901319822968: início "3. EMENTA"          → fim "11. PUBLICADO"
// - LATAM — lista 901303695381: início "ESTRUTURACAO DAS AULAS" → fim "PUBLICADO/FINALIZADO"
//   - extra LATAM: gravação = "GRAVACAO" → "REVISAO"
//
// Estratégia para extrair os timestamps de cada status:
// - O ClickUp expõe o histórico de mudanças de status via:
//   GET /api/v2/task/{task_id}?include_subtasks=false
//   → o campo `status_history` (quando habilitado) lista cada transição com timestamp.
// - Quando `status_history` não vier no payload, fazemos fallback usando:
//   * date_created  → como início (assume que a task começou no status inicial)
//   * date_done     → como conclusão (apenas quando o status atual bate com o status final esperado)
// - Esse fallback garante que tasks "em andamento" não fiquem com leadtime fantasma.

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;

interface ListConfig {
  listId: string;
  regiao: "ALURA" | "LATAM";
  startStatus: string;     // nome (canonicalizado) do status de início
  endStatus: string;       // nome (canonicalizado) do status de conclusão
  gravStartStatus?: string; // apenas LATAM
  gravEndStatus?: string;   // apenas LATAM
}

const LIST_CONFIGS: ListConfig[] = [
  {
    listId: "901311315105",
    regiao: "ALURA",
    startStatus: "2. em planejamento",
    endStatus: "9. publicado",
  },
  {
    listId: "901319822968",
    regiao: "ALURA",
    startStatus: "3. ementa",
    endStatus: "11. publicado",
  },
  {
    listId: "901303695381",
    regiao: "LATAM",
    startStatus: "estruturacao das aulas",
    endStatus: "publicado/finalizado",
    gravStartStatus: "gravacao",
    gravEndStatus: "revisao",
  },
];

// Normaliza o nome de um status para comparação:
// - lowercase, trim
// - remove acentos (estruturação → estruturacao)
function canonicalizeStatus(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface ClickUpStatusHistoryEntry {
  status: string;
  // ClickUp pode entregar timestamps em campos diferentes dependendo do endpoint:
  // - `total_time.since` (epoch ms em string) — endpoint task/{id}
  // - `orderindex` etc. (irrelevante)
  total_time?: { since?: string | number };
  // alguns workspaces expõem diretamente:
  timestamp?: string | number;
}

interface ClickUpTaskListItem {
  id: string;
  name: string;
  date_created: string | null;
  date_done: string | null;
  status: { status: string };
}

interface ClickUpTaskDetail {
  id: string;
  name: string;
  date_created: string | null;
  date_done: string | null;
  status: { status: string };
  status_history?: ClickUpStatusHistoryEntry[];
  // alguns endpoints retornam history_items
  history_items?: Array<{
    type: number; // 1 = status change
    after?: { status?: string };
    before?: { status?: string };
    date: string | number;
  }>;
}

const MAX_PAGES = 30; // proteção contra loop infinito (1 página = ~100 tasks → 3000 tasks por lista)

async function fetchListTasks(listId: string): Promise<ClickUpTaskListItem[]> {
  const tasks: ClickUpTaskListItem[] = [];
  let page = 0;

  while (page < MAX_PAGES) {
    const url = `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&subtasks=false&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: CLICKUP_API_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickUp list ${listId} page ${page} → ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const pageTasks: ClickUpTaskListItem[] = data.tasks ?? [];
    tasks.push(...pageTasks);

    if (data.last_page === true || pageTasks.length === 0) break;
    page++;
  }

  return tasks;
}

async function fetchTaskDetail(taskId: string): Promise<ClickUpTaskDetail | null> {
  const url = `https://api.clickup.com/api/v2/task/${taskId}?include_subtasks=false`;
  const res = await fetch(url, { headers: { Authorization: CLICKUP_API_KEY } });

  if (!res.ok) {
    // Logamos mas não derrubamos o sync inteiro por causa de uma task
    console.warn(`[leadtimes sync] task ${taskId} detail → ${res.status}`);
    return null;
  }

  return res.json();
}

// Extrai o timestamp (em ms) em que a task entrou em cada status.
// Retorna { [statusCanonicalizado]: msEpoch }.
function extractStatusEnterTimestamps(detail: ClickUpTaskDetail): Map<string, number> {
  const map = new Map<string, number>();

  // Caso 1: campo status_history (mais comum)
  if (Array.isArray(detail.status_history)) {
    for (const entry of detail.status_history) {
      const ts =
        entry.timestamp !== undefined
          ? Number(entry.timestamp)
          : entry.total_time?.since !== undefined
          ? Number(entry.total_time.since)
          : NaN;
      if (!Number.isFinite(ts)) continue;
      const key = canonicalizeStatus(entry.status);
      // Mantém o PRIMEIRO ingresso em cada status (status_history pode listar múltiplas)
      if (!map.has(key)) map.set(key, ts);
    }
  }

  // Caso 2: history_items (estilo audit log)
  if (Array.isArray(detail.history_items)) {
    for (const item of detail.history_items) {
      // type 1 = status change
      if (item.type !== 1) continue;
      const newStatus = item.after?.status;
      if (!newStatus) continue;
      const ts = Number(item.date);
      if (!Number.isFinite(ts)) continue;
      const key = canonicalizeStatus(newStatus);
      if (!map.has(key)) map.set(key, ts);
    }
  }

  return map;
}

// Busca o timestamp em que a task entrou no status alvo, com fallbacks seguros.
function pickTimestamp(
  enterMap: Map<string, number>,
  detail: ClickUpTaskDetail,
  targetStatus: string,
  options: { fallbackCreated?: boolean; fallbackDoneIfCurrent?: boolean }
): number | null {
  const direct = enterMap.get(targetStatus);
  if (direct !== undefined) return direct;

  if (options.fallbackCreated && detail.date_created) {
    const ts = Number(detail.date_created);
    if (Number.isFinite(ts)) return ts;
  }

  if (options.fallbackDoneIfCurrent) {
    const currentStatus = canonicalizeStatus(detail.status?.status ?? "");
    if (currentStatus === targetStatus && detail.date_done) {
      const ts = Number(detail.date_done);
      if (Number.isFinite(ts)) return ts;
    }
  }

  return null;
}

// Calcula a diferença em dias entre dois timestamps (ms epoch).
// Retorna null se algum dos timestamps for null/zero.
function diffDias(start: number | null, end: number | null): number | null {
  if (start === null || end === null) return null;
  if (end < start) return null;
  const dias = (end - start) / 86_400_000;
  return Math.round(dias * 100) / 100; // 2 casas decimais
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CLICKUP_API_KEY) {
    return NextResponse.json(
      { error: "CLICKUP_API_KEY não configurada" },
      { status: 500 }
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let total = 0;
  const errors: string[] = [];

  try {
    for (const config of LIST_CONFIGS) {
      let listTasks: ClickUpTaskListItem[];
      try {
        listTasks = await fetchListTasks(config.listId);
      } catch (err) {
        errors.push(
          `Lista ${config.listId}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }

      total += listTasks.length;

      for (const item of listTasks) {
        const detail = await fetchTaskDetail(item.id);
        if (!detail) {
          skipped++;
          continue;
        }

        const enterMap = extractStatusEnterTimestamps(detail);

        const startTs = pickTimestamp(enterMap, detail, config.startStatus, {
          fallbackCreated: true,
        });
        const endTs = pickTimestamp(enterMap, detail, config.endStatus, {
          fallbackDoneIfCurrent: true,
        });

        const dataInicio = startTs !== null ? new Date(startTs) : null;
        const dataConclusao = endTs !== null ? new Date(endTs) : null;
        const leadtimeDias = diffDias(startTs, endTs);

        let dataGravInicio: Date | null = null;
        let dataGravFim: Date | null = null;
        let leadtimeGravacao: number | null = null;

        if (config.regiao === "LATAM") {
          const gravStart = config.gravStartStatus
            ? pickTimestamp(enterMap, detail, config.gravStartStatus, {})
            : null;
          const gravEnd = config.gravEndStatus
            ? pickTimestamp(enterMap, detail, config.gravEndStatus, {})
            : null;

          dataGravInicio = gravStart !== null ? new Date(gravStart) : null;
          dataGravFim = gravEnd !== null ? new Date(gravEnd) : null;
          leadtimeGravacao = diffDias(gravStart, gravEnd);
        }

        const data = {
          name: item.name,
          listId: config.listId,
          regiao: config.regiao,
          dataInicio,
          dataConclusao,
          leadtimeDias,
          dataGravInicio,
          dataGravFim,
          leadtimeGravacao,
          syncedAt: new Date(),
        };

        const existing = await prisma.leadtimeTask.findUnique({
          where: { clickupTaskId: item.id },
        });

        if (existing) {
          await prisma.leadtimeTask.update({
            where: { clickupTaskId: item.id },
            data,
          });
          updated++;
        } else {
          await prisma.leadtimeTask.create({
            data: {
              clickupTaskId: item.id,
              ...data,
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      total,
      created,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[leadtimes sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
