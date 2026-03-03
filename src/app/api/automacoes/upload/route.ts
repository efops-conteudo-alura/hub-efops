import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AutomationType, AutomationStatus } from "@prisma/client";
import * as XLSX from "xlsx";

const TYPE_MAP: Record<string, AutomationType> = {
  automação: "AUTOMATION",
  automacao: "AUTOMATION",
  automation: "AUTOMATION",
  agente: "AGENT",
  agent: "AGENT",
};

const STATUS_MAP: Record<string, AutomationStatus> = {
  ativa: "ACTIVE",
  active: "ACTIVE",
  inativa: "INACTIVE",
  inactive: "INACTIVE",
  testando: "TESTING",
  testing: "TESTING",
};

function buildTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["nome", "tipo", "descricaoCurta", "descricaoCompleta", "urlImagem", "link", "status", "criador", "ferramentas", "horasEconomizadas", "economiaMensal", "descricaoROI"],
    ["Bot de Relatórios", "AUTOMAÇÃO", "Gera relatórios semanais", "", "", "https://make.com", "ATIVA", "Vasco", "Make, ChatGPT", 3.5, 1200, "Elimina tarefa manual semanal"],
  ]);
  ws["!cols"] = [
    { wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 25 }, { wch: 20 },
    { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
    { wch: 15 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Automações");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET() {
  const buffer = buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-automacoes.xlsx"',
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  if (rows.length < 2) {
    return NextResponse.json({ error: "Arquivo vazio ou sem dados" }, { status: 400 });
  }

  const [header, ...dataRows] = rows as string[][];
  const expectedHeaders = ["nome", "tipo", "descricaoCurta", "descricaoCompleta", "urlImagem", "link", "status", "criador", "ferramentas", "horasEconomizadas", "economiaMensal", "descricaoROI"];
  const hasValidHeader = expectedHeaders.every(
    (h, i) => String(header[i] ?? "").toLowerCase().trim() === h
  );
  if (!hasValidHeader) {
    return NextResponse.json(
      { error: `Cabeçalho inválido. Baixe o template para ver o formato correto.` },
      { status: 400 }
    );
  }

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    const lineNum = i + 2;
    const nome = String(row[0] ?? "").trim();
    if (!nome) { errors.push(`Linha ${lineNum}: nome obrigatório`); continue; }

    const tipoRaw = String(row[1] ?? "").toLowerCase().trim();
    const type: AutomationType = TYPE_MAP[tipoRaw] ?? "AUTOMATION";

    const statusRaw = String(row[6] ?? "").toLowerCase().trim();
    const status: AutomationStatus = STATUS_MAP[statusRaw] ?? "ACTIVE";

    const ferramentasRaw = row[8] ? String(row[8]).trim() : "";
    const tools = ferramentasRaw
      ? ferramentasRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const horasRaw = row[9];
    const roiHoursSaved = horasRaw !== undefined && horasRaw !== "" ? parseFloat(String(horasRaw)) : null;
    const economiaRaw = row[10];
    const roiMonthlySavings = economiaRaw !== undefined && economiaRaw !== "" ? parseFloat(String(economiaRaw)) : null;

    await prisma.automation.create({
      data: {
        name: nome,
        type,
        shortDesc: row[2] ? String(row[2]).trim() : null,
        fullDesc: row[3] ? String(row[3]).trim() : null,
        thumbnailUrl: row[4] ? String(row[4]).trim() : null,
        link: row[5] ? String(row[5]).trim() : null,
        status,
        creator: row[7] ? String(row[7]).trim() : null,
        tools,
        roiHoursSaved: roiHoursSaved && !isNaN(roiHoursSaved) ? roiHoursSaved : null,
        roiMonthlySavings: roiMonthlySavings && !isNaN(roiMonthlySavings) ? roiMonthlySavings : null,
        roiDescription: row[11] ? String(row[11]).trim() : null,
      },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors });
}
