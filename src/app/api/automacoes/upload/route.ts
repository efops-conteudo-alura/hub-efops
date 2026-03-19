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
  "agente de ia": "AGENT",
};

const STATUS_MAP: Record<string, AutomationStatus> = {
  ativa: "ACTIVE",
  ativo: "ACTIVE",
  active: "ACTIVE",
  inativa: "INACTIVE",
  inativo: "INACTIVE",
  inactive: "INACTIVE",
  testando: "TESTING",
  "em teste": "TESTING",
  testing: "TESTING",
};

const COL_ALIASES: Record<string, string> = {
  nome: "nome", name: "nome",
  tipo: "tipo", type: "tipo",
  descricaocurta: "descricaoCurta", "descricao curta": "descricaoCurta", "descrição curta": "descricaoCurta",
  shortdesc: "descricaoCurta", "breve descricao": "descricaoCurta", "breve descrição": "descricaoCurta",
  descricaocompleta: "descricaoCompleta", "descricao completa": "descricaoCompleta",
  "descrição completa": "descricaoCompleta", fulldesc: "descricaoCompleta", descricao: "descricaoCompleta",
  urlimagem: "urlImagem", "url imagem": "urlImagem", imagem: "urlImagem", thumbnail: "urlImagem",
  link: "link", url: "link",
  status: "status",
  criador: "criador", creator: "criador", "criado por": "criador",
  ferramentas: "ferramentas", tools: "ferramentas", "ferramentas utilizadas": "ferramentas",
  horaseeconomizadas: "horasEconomizadas", "horas economizadas": "horasEconomizadas",
  hourssaved: "horasEconomizadas", roi_horas: "horasEconomizadas",
  economramensal: "economiaMensal", "economia mensal": "economiaMensal",
  monthlysavings: "economiaMensal", roi_valor: "economiaMensal",
  descricaoroi: "descricaoROI", "descricao roi": "descricaoROI", "descrição roi": "descricaoROI",
  roi: "descricaoROI", roidescription: "descricaoROI",
};

function normalizeKey(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function buildColMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = COL_ALIASES[normalizeKey(h)];
    if (key && !(key in map)) map[key] = i;
  });
  return map;
}

function col(row: string[], map: Record<string, number>, key: string): string {
  const i = map[key];
  return i !== undefined ? String(row[i] ?? "").trim() : "";
}

function colNum(row: string[], map: Record<string, number>, key: string): number | null {
  const i = map[key];
  if (i === undefined || row[i] === undefined || row[i] === "") return null;
  const n = parseFloat(String(row[i]).replace(",", "."));
  return isNaN(n) ? null : n;
}

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
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const [rawHeader, ...dataRows] = rows as string[][];
  const colMap = buildColMap(rawHeader);

  if (!("nome" in colMap)) {
    return NextResponse.json(
      { error: 'Coluna obrigatória "nome" não encontrada. Verifique os cabeçalhos.' },
      { status: 400 }
    );
  }

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    const lineNum = i + 2;
    const nome = col(row, colMap, "nome");
    if (!nome) { errors.push(`Linha ${lineNum}: nome obrigatório`); continue; }

    const tipoRaw = col(row, colMap, "tipo").toLowerCase();
    const type: AutomationType = TYPE_MAP[tipoRaw] ?? "AUTOMATION";

    const statusRaw = col(row, colMap, "status").toLowerCase();
    const status: AutomationStatus = STATUS_MAP[statusRaw] ?? "ACTIVE";

    const ferramentasRaw = col(row, colMap, "ferramentas");
    const tools = ferramentasRaw
      ? ferramentasRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    await prisma.automation.create({
      data: {
        name: nome,
        type,
        shortDesc: col(row, colMap, "descricaoCurta") || null,
        fullDesc: col(row, colMap, "descricaoCompleta") || null,
        thumbnailUrl: col(row, colMap, "urlImagem") || null,
        link: col(row, colMap, "link") || null,
        status,
        creator: col(row, colMap, "criador") || null,
        tools,
        roiHoursSaved: colNum(row, colMap, "horasEconomizadas"),
        roiMonthlySavings: colNum(row, colMap, "economiaMensal"),
        roiDescription: col(row, colMap, "descricaoROI") || null,
      },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors });
}
