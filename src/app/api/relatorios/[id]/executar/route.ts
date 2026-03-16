import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const userMessage = `${periodInfo}DADOS:\n${dadosFormatados}`;

  // Chamar Claude
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: report.aiInstructions,
    messages: [{ role: "user", content: userMessage }],
  });

  const resultado = message.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { type: "text"; text: string }).text)
    .join("\n");

  // Salvar resultado
  const analise = await prisma.aiAnaliseResult.create({
    data: {
      reportId: id,
      params: {
        ...(periodoInicio ? { periodoInicio } : {}),
        ...(periodoFim ? { periodoFim } : {}),
        ...(arquivoNome ? { arquivoNome } : {}),
      },
      resultado,
      totalRows: rows.length > 0 ? rows.length : null,
    },
  });

  return NextResponse.json({
    id: analise.id,
    params: analise.params,
    resultado: analise.resultado,
    totalRows: analise.totalRows,
    createdAt: analise.createdAt.toISOString(),
  });
}
