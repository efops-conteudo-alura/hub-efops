import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;

interface ClickUpAssignee {
  id: number;
  username: string;
  email: string;
}

interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  value: unknown;
  type_config?: {
    options?: Array<{ id: string; name: string; orderindex: number }>;
  };
}

interface ClickUpTask {
  id: string;
  name: string;
  date_done: string | null;
  assignees: ClickUpAssignee[];
  status: { status: string; type: string };
  custom_fields?: ClickUpCustomField[];
}


interface Colaborador {
  id: string;
  nome: string;
  clickupUsername: string | null;
  cargaHorariaDiaria: number;
  tipo: string;
  regraJson: string | null;
  ordem: number;
}

function parseCourseIdAndName(raw: string): { id: string; nome: string } {
  const text = raw.trim();
  // Formato: "1234 - Nome do curso" ou "1234 Nome do curso"
  const m = text.match(/^(\d{4})\s*[-–—]\s*(.+)$/);
  if (m) return { id: m[1], nome: m[2].trim() };
  const m2 = text.match(/^(\d{4})\s+(.+)$/);
  if (m2) return { id: m2[1], nome: m2[2].trim() };
  // Formato audiovisual: ID pode estar no meio
  const mAny = text.match(/(\d{4})/);
  if (mAny) {
    const id = mAny[1];
    const nome = text.replace(id, "").replace(/[-–—:|]/g, " ").replace(/\s+/g, " ").trim();
    return { id, nome };
  }
  return { id: "", nome: text };
}

async function fetchPaginado(url: string): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;
  while (true) {
    const res = await fetch(`${url}&page=${page}`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickUp API error ${res.status}: ${text}`);
    }
    const data = await res.json();
    tasks.push(...(data.tasks ?? []));
    if (data.last_page === true || !data.tasks?.length) break;
    page++;
  }
  return tasks;
}

async function fetchTasksDoMes(
  listIds: string[],
  dataInicio: Date,
  dataFim: Date
): Promise<ClickUpTask[]> {
  const gtMs = dataInicio.getTime();
  const lteMs = dataFim.getTime() + 86399999; // até o final do dia

  const todasTasks: ClickUpTask[] = [];

  for (const listId of listIds) {
    const base = `https://api.clickup.com/api/v2/list/${listId}/task`;

    // Busca 1: tarefas concluídas no período
    // Aceita qualquer tipo exceto "open" (não iniciado — não deveria aparecer aqui, mas por segurança)
    const comData = await fetchPaginado(
      `${base}?include_closed=true&date_done_gt=${gtMs}&date_done_lte=${lteMs}`
    );
    const comDataFiltradas = comData.filter(
      (t) => t.status?.type?.toLowerCase().trim() !== "open"
    );

    // Busca 2: tarefas abertas — apenas "in_progress"
    // Exclui "open" (não iniciado) e "done" (publicado/concluído mas não fechado no ClickUp)
    const abertas = await fetchPaginado(`${base}?include_closed=false`);
    const abertasFiltradas = abertas.filter(
      (t) => t.status?.type?.toLowerCase().trim() === "in_progress"
    );

    todasTasks.push(...comDataFiltradas, ...abertasFiltradas);
  }

  // Deduplica por ID
  const vistas = new Set<string>();
  return todasTasks.filter((t) => {
    if (vistas.has(t.id)) return false;
    vistas.add(t.id);
    return true;
  });
}

function calcularImobilizacao(
  cursos: { key: string; id: string; nome: string }[],
  cursoParaPessoas: Map<string, Set<string>>,
  colaboradores: Colaborador[],
  diasUteis: number
): Map<string, Map<string, number>> {
  const maxAlloc = Math.floor(diasUteis * 8 * 0.75);

  // 1. Conta quantos cursos cada NORMAL trabalhou
  const contagemPorPessoa: Record<string, number> = {};
  for (const [, pessoas] of cursoParaPessoas) {
    for (const nome of pessoas) {
      const col = colaboradores.find((c) => c.nome === nome || c.clickupUsername === nome);
      if (!col || col.tipo !== "NORMAL") continue;
      contagemPorPessoa[col.nome] = (contagemPorPessoa[col.nome] || 0) + 1;
    }
  }

  const alloc = new Map<string, Map<string, number>>();
  for (const curso of cursos) alloc.set(curso.key, new Map());

  // 2. Calcula alocação base por tipo
  for (const curso of cursos) {
    const presentes = cursoParaPessoas.get(curso.key) ?? new Set();
    const mapa = alloc.get(curso.key)!;

    for (const col of colaboradores) {
      const regra = col.regraJson ? (JSON.parse(col.regraJson) as Record<string, unknown>) : null;
      const estaPresente = presentes.has(col.nome) || (col.clickupUsername ? presentes.has(col.clickupUsername) : false);

      if (col.tipo === "NORMAL" && estaPresente) {
        const n = contagemPorPessoa[col.nome] || 1;
        mapa.set(col.nome, Math.ceil(maxAlloc / n));
      }

      if (col.tipo === "ESPECIAL") {
        const horas = estaPresente
          ? (regra?.horasPresente as number ?? 5)
          : (regra?.horasAusente as number ?? 1);
        mapa.set(col.nome, horas);
      }
    }
  }

  // 3. LÍDERES: 1h se algum liderado tem horas no curso
  for (const col of colaboradores.filter((c) => c.tipo === "LIDER")) {
    const regra = col.regraJson ? (JSON.parse(col.regraJson) as { liderados?: string[] }) : {};
    const liderados = regra.liderados ?? [];
    for (const [key, mapa] of alloc) {
      const algumLideradoTemHoras = liderados.some((l) => (mapa.get(l) ?? 0) > 0);
      if (algumLideradoTemHoras && !mapa.has(col.nome)) {
        mapa.set(col.nome, 1);
      }
    }
  }

  return alloc;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ ano: string; mes: string; timeId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CLICKUP_API_KEY) {
    return NextResponse.json({ error: "CLICKUP_API_KEY não configurado" }, { status: 500 });
  }

  const { ano: anoStr, mes: mesStr, timeId } = await params;
  const ano = parseInt(anoStr);
  const mes = parseInt(mesStr);

  if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ error: "Ano ou mês inválidos" }, { status: 400 });
  }

  // Busca período
  const periodo = await prisma.imobilizacaoPeriodo.findUnique({
    where: { ano_mes: { ano, mes } },
  });
  if (!periodo) {
    return NextResponse.json({ error: "Período não encontrado" }, { status: 404 });
  }
  if (!periodo.diasUteis || periodo.diasUteis === 0) {
    return NextResponse.json(
      { error: "O período não tem dias úteis configurados" },
      { status: 400 }
    );
  }

  // Busca time e colaboradores
  const time = await prisma.imobilizacaoTime.findUnique({
    where: { id: timeId },
    include: { colaboradores: { orderBy: { ordem: "asc" } } },
  });
  if (!time) {
    return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
  }

  // Define o intervalo de datas do período
  const dataInicio = periodo.dataInicio ?? new Date(ano, mes - 1, 1);
  const dataFim = periodo.dataFim ?? new Date(ano, mes, 0); // último dia do mês

  try {
    // Monta lista de IDs (principal + adicionais)
    const listIds = [
      time.clickupListId,
      ...(time.clickupListIdsAdicionais
        ? time.clickupListIdsAdicionais.split(",").map((s) => s.trim()).filter(Boolean)
        : []),
    ];

    // Busca tasks do ClickUp: concluídas no período + abertas (sem data de conclusão)
    const tasks = await fetchTasksDoMes(listIds, dataInicio, dataFim);

    // Monta mapa: cursoKey → Set<nomeResponsável>
    const cursoParaPessoas = new Map<string, Set<string>>();
    const cursoMeta = new Map<string, { id: string; nome: string }>();
    const cursosOrder: string[] = [];

    // Nomes válidos do time (inclui clickupUsername como alternativa)
    const nomesValidos = new Set<string>();
    for (const col of time.colaboradores) {
      nomesValidos.add(col.nome);
      if (col.clickupUsername) nomesValidos.add(col.clickupUsername);
    }

    console.log("[imobilizacao sync] total tasks brutas:", tasks.length);

    for (const task of tasks) {
      const { id: cursoId, nome: cursoNome } = parseCourseIdAndName(task.name);
      const cursoKey = task.name.trim();

      // Filtra assignees: mantém apenas os do time
      const responsaveis = task.assignees
        .map((a) => a.username)
        .filter((u) => nomesValidos.has(u));

      if (responsaveis.length === 0) continue;

      if (!cursoParaPessoas.has(cursoKey)) {
        cursoParaPessoas.set(cursoKey, new Set());
        cursoMeta.set(cursoKey, { id: cursoId, nome: cursoNome });
        cursosOrder.push(cursoKey);
      }

      for (const r of responsaveis) {
        cursoParaPessoas.get(cursoKey)!.add(r);
      }
    }

    console.log("[imobilizacao sync] cursos encontrados:", cursosOrder.length);

    if (cursosOrder.length === 0) {
      return NextResponse.json({
        ok: true,
        cursos: 0,
        entries_criadas: 0,
        aviso: `Nenhum curso encontrado com responsáveis deste time no período (tasks brutas: ${tasks.length})`,
      });
    }

    const cursos = cursosOrder.map((key) => ({
      key,
      ...cursoMeta.get(key)!,
    }));

    // Calcula alocação
    const alloc = calcularImobilizacao(
      cursos,
      cursoParaPessoas,
      time.colaboradores,
      periodo.diasUteis
    );

    // Normaliza: se o assignee username foi usado, resolve para o nome do colaborador
    const usernameParaNome = new Map<string, string>();
    for (const col of time.colaboradores) {
      if (col.clickupUsername) usernameParaNome.set(col.clickupUsername, col.nome);
    }
    const colaboradorPorNome = new Map(time.colaboradores.map((c) => [c.nome, c]));

    // Monta entries para inserir
    const entries: {
      periodoId: string;
      timeId: string;
      colaboradorNome: string;
      colaboradorMatricula: string | null;
      cargaHorariaDiaria: number | null;
      produtoId: string | null;
      produtoNome: string;
      produtoTipo: string;
      horas: number;
    }[] = [];

    for (const curso of cursos) {
      const mapa = alloc.get(curso.key)!;
      for (const [nomeOuUsername, horas] of mapa) {
        if (horas <= 0) continue;
        const nomeReal = usernameParaNome.get(nomeOuUsername) ?? nomeOuUsername;
        const col = colaboradorPorNome.get(nomeReal);
        entries.push({
          periodoId: periodo.id,
          timeId: time.id,
          colaboradorNome: nomeReal,
          colaboradorMatricula: col?.matricula ?? null,
          cargaHorariaDiaria: col ? col.cargaHorariaDiaria : null,
          produtoId: curso.id || null,
          produtoNome: curso.nome,
          produtoTipo: "curso",
          horas,
        });
      }
    }

    // Substitui entries antigas deste time neste período
    await prisma.$transaction([
      prisma.imobilizacaoEntry.deleteMany({
        where: { periodoId: periodo.id, timeId: time.id },
      }),
      prisma.imobilizacaoEntry.createMany({
        data: entries,
        skipDuplicates: true,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      cursos: cursos.length,
      colaboradores: time.colaboradores.length,
      entries_criadas: entries.length,
    });
  } catch (err) {
    console.error("[imobilizacao sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
