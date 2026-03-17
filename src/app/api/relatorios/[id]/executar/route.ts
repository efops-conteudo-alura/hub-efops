import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ClickUpCustomField {
  name: string;
  type: string;
  value?: unknown;
}

interface ClickUpTask {
  name: string;
  date_created: string;
  status: { status: string };
  custom_fields: ClickUpCustomField[];
}

function extractFieldValue(field: ClickUpCustomField): string {
  if (field.value == null || field.value === "") return "";
  if (typeof field.value === "string") return field.value;
  if (typeof field.value === "number") return String(field.value);
  if (Array.isArray(field.value)) {
    return (field.value as Array<Record<string, unknown>>)
      .map((v) => v.label ?? v.name ?? v.value ?? "")
      .filter(Boolean)
      .join(", ");
  }
  if (typeof field.value === "object") {
    const obj = field.value as Record<string, unknown>;
    return String(obj.name ?? obj.label ?? obj.value ?? "");
  }
  return String(field.value);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.type !== "AI_ANALYSIS") {
    return NextResponse.json({ error: "Relatório não encontrado ou tipo inválido" }, { status: 404 });
  }
  if (!report.aiInstructions) {
    return NextResponse.json({ error: "Instruções da IA não configuradas" }, { status: 400 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo") as File | null;
  const periodoInicio = formData.get("periodoInicio") as string | null;
  const periodoFim = formData.get("periodoFim") as string | null;

  // Parse XLSX/CSV
  let rows: Record<string, string>[] = [];
  let arquivoNome: string | undefined;

  if (arquivo) {
    arquivoNome = arquivo.name;
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    rows = rawRows.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? "")]))
    );
  }

  // Filtrar por período se necessário
  if (periodoInicio && periodoFim && rows.length > 0) {
    const inicio = new Date(periodoInicio);
    const fim = new Date(periodoFim);
    fim.setHours(23, 59, 59, 999);

    // Encontrar coluna de data (contém "início" ou "início" no nome)
    const allKeys = Object.keys(rows[0] ?? {});
    const dateKey = allKeys.find((k) =>
      k.toLowerCase().includes("in\u00edcio") ||
      k.toLowerCase().includes("inicio") ||
      k.toLowerCase().includes("data")
    );

    if (dateKey) {
      rows = rows.filter((row) => {
        const val = row[dateKey];
        if (!val) return false;
        const d = new Date(val);
        return !isNaN(d.getTime()) && d >= inicio && d <= fim;
      });
    }
  }

  if (report.aiNeedsFile && rows.length === 0 && arquivo) {
    return NextResponse.json({ error: "Nenhuma linha encontrada no período selecionado." }, { status: 400 });
  }

  // Buscar registros do ClickUp se necessário
  let clickupInfo = "";
  let clickupTotalRows = 0;

  if (report.aiNeedsClickup && report.aiClickupListIds) {
    const apiKey = process.env.CLICKUP_API_KEY;
    if (apiKey) {
      const listIds = report.aiClickupListIds.split(",").map((s) => s.trim()).filter(Boolean);
      const allTasks: ClickUpTask[] = [];

      for (const listId of listIds) {
        let page = 0;
        while (true) {
          const url = `https://api.clickup.com/api/v2/list/${listId}/task?include_closed=true&page=${page}`;
          const res = await fetch(url, { headers: { Authorization: apiKey } });
          if (!res.ok) break;
          const data = await res.json() as { tasks?: ClickUpTask[]; last_page?: boolean };
          allTasks.push(...(data.tasks ?? []));
          if (data.last_page === true || !data.tasks?.length) break;
          page++;
        }
      }

      // Filtrar por período se indicado
      let filteredTasks = allTasks;
      if (periodoInicio && periodoFim) {
        const inicioTs = new Date(periodoInicio).getTime();
        const fimDate = new Date(periodoFim);
        fimDate.setHours(23, 59, 59, 999);
        const fimTs = fimDate.getTime();
        filteredTasks = allTasks.filter((t) => {
          const ts = Number(t.date_created);
          return ts >= inicioTs && ts <= fimTs;
        });
      }

      if (filteredTasks.length > 0) {
        clickupTotalRows = filteredTasks.length;
        const records = filteredTasks.map((task, i) => {
          const date = new Date(Number(task.date_created)).toLocaleDateString("pt-BR");
          const parts: string[] = [
            `tarefa: ${task.name}`,
            `data: ${date}`,
            `status: ${task.status.status}`,
          ];
          for (const field of task.custom_fields) {
            const value = extractFieldValue(field);
            if (value) parts.push(`${field.name}: ${value}`);
          }
          return `${i + 1}. ${parts.join(" | ")}`;
        });
        clickupInfo = `\nREGISTROS DO CLICKUP — ${filteredTasks.length} tarefas:\n${records.join("\n")}\n`;
      }
    }
  }

  // Montar mensagem para Claude
  const periodInfo = periodoInicio && periodoFim
    ? `Período de análise: ${new Date(periodoInicio).toLocaleDateString("pt-BR")} a ${new Date(periodoFim).toLocaleDateString("pt-BR")}\nTotal de respostas no período: ${rows.length}\n\n`
    : "";

  const dadosFormatados = rows.length > 0
    ? rows.map((row, i) => {
        const linha = Object.entries(row)
          .filter(([, v]) => v && v.toString().trim())
          .map(([k, v]) => `${k}: ${v}`)
          .join(" | ");
        return `${i + 1}. ${linha}`;
      }).join("\n")
    : "(nenhum dado fornecido)";

  const userMessage = `${periodInfo}${clickupInfo}DADOS:\n${dadosFormatados}`;

  // Injetar instrução do marcador Gamma se necessário
  const systemPrompt = report.aiHasPresentation
    ? `${report.aiInstructions}\n\nIMPORTANTE: Antes da seção de roteiro de apresentação, insira exatamente esta linha isolada, sem nada antes ou depois dela na mesma linha:\n<!-- GAMMA_SLIDES -->`
    : report.aiInstructions;

  // Chamar Claude
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textoCompleto = message.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("\n");

  // Separar roteiro de apresentação do restante usando o marcador injetado
  const GAMMA_MARKER = "<!-- GAMMA_SLIDES -->";
  const markerIndex = textoCompleto.indexOf(GAMMA_MARKER);
  const resultado = markerIndex !== -1
    ? textoCompleto.slice(0, markerIndex).trimEnd()
    : textoCompleto;
  const resultadoApresentacao = markerIndex !== -1
    ? textoCompleto.slice(markerIndex + GAMMA_MARKER.length).trim()
    : null;

  // Salvar resultado
  const analise = await prisma.aiAnaliseResult.create({
    data: {
      reportId: id,
      params: {
        ...(periodoInicio ? { periodoInicio } : {}),
        ...(periodoFim ? { periodoFim } : {}),
        ...(arquivoNome ? { arquivoNome } : {}),
        ...(clickupTotalRows > 0 ? { clickupTasks: clickupTotalRows } : {}),
      },
      resultado,
      resultadoApresentacao,
      totalRows: rows.length > 0 ? rows.length : clickupTotalRows > 0 ? clickupTotalRows : null,
    },
  });

  return NextResponse.json({
    id: analise.id,
    params: analise.params,
    resultado: analise.resultado,
    resultadoApresentacao: analise.resultadoApresentacao,
    gammaUrl: analise.gammaUrl,
    totalRows: analise.totalRows,
    createdAt: analise.createdAt.toISOString(),
  });
}
