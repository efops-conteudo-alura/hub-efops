import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BillingCycle, LoginType } from "@prisma/client";
import * as XLSX from "xlsx";

const LOGIN_TYPE_MAP: Record<string, LoginType> = {
  senha: "PASSWORD",
  código: "CODE",
  codigo: "CODE",
  password: "PASSWORD",
  code: "CODE",
};

const BILLING_CYCLE_MAP: Record<string, BillingCycle> = {
  mensal: "MONTHLY",
  monthly: "MONTHLY",
  anual: "ANNUALLY",
  annually: "ANNUALLY",
  único: "ONE_TIME",
  unico: "ONE_TIME",
  one_time: "ONE_TIME",
  uso: "USAGE",
  usage: "USAGE",
};

const CURRENCY_VALID = ["BRL", "USD", "EUR"];

// Mapeamento de nomes de coluna → campo interno
const COL_ALIASES: Record<string, string> = {
  nome: "nome", name: "nome",
  plano: "plano", plan: "plano", planname: "plano",
  descricao: "descricao", descrição: "descricao", description: "descricao",
  url: "url", site: "url", link: "url",
  loginuser: "loginUser", usuario: "loginUser", "login/email": "loginUser", login: "loginUser", email: "loginUser",
  logintype: "loginType", "tipo de login": "loginType", tipologin: "loginType",
  custo: "custo", cost: "custo", valor: "custo", price: "custo",
  moeda: "moeda", currency: "moeda",
  ciclo: "ciclo", cycle: "ciclo", "ciclo de cobrança": "ciclo", billingcycle: "ciclo",
  centrocusto: "centroCusto", "centro de custo": "centroCusto", costcenter: "centroCusto",
  time: "time", team: "time", equipe: "time",
  responsavel: "responsavel", responsável: "responsavel", responsible: "responsavel",
  ativa: "ativa", ativo: "ativa", active: "ativa", isactive: "ativa", status: "ativa",
  datarenovacao: "dataRenovacao", "data de renovação": "dataRenovacao", "data renovacao": "dataRenovacao", renewaldate: "dataRenovacao",
  notas: "notas", notes: "notas", observacoes: "notas", observações: "notas",
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

function colRaw(row: string[], map: Record<string, number>, key: string): unknown {
  const i = map[key];
  return i !== undefined ? row[i] : undefined;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return new Date(s);
  if (typeof raw === "number") {
    const date = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function buildTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["nome", "plano", "descricao", "url", "loginUser", "loginType", "custo", "moeda", "ciclo", "centroCusto", "time", "responsavel", "ativa", "dataRenovacao", "notas"],
    ["GitHub", "Teams", "Controle de versão", "https://github.com", "admin@alura.com", "SENHA", 500, "BRL", "MENSAL", "720ALURA225CONTEUDO", "Conteúdo", "Vasco", "SIM", "", ""],
  ]);
  ws["!cols"] = [
    { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 22 },
    { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 28 },
    { wch: 14 }, { wch: 14 }, { wch: 6 }, { wch: 14 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Licenças");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-licencas.xlsx"',
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
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

    const loginTypeRaw = col(row, colMap, "loginType").toLowerCase();
    const loginType: LoginType = LOGIN_TYPE_MAP[loginTypeRaw] ?? "PASSWORD";

    const cicloRaw = col(row, colMap, "ciclo").toLowerCase();
    const billingCycle: BillingCycle = BILLING_CYCLE_MAP[cicloRaw] ?? "MONTHLY";

    const moedaRaw = col(row, colMap, "moeda").toUpperCase();
    const currency = CURRENCY_VALID.includes(moedaRaw) ? moedaRaw : "BRL";

    const custoStr = col(row, colMap, "custo").replace(",", ".");
    const cost = custoStr ? parseFloat(custoStr) : null;

    const ativaRaw = col(row, colMap, "ativa").toLowerCase();
    const isActive = ativaRaw !== "não" && ativaRaw !== "nao" && ativaRaw !== "false" && ativaRaw !== "0";

    const renewalDate = parseDate(colRaw(row, colMap, "dataRenovacao"));

    await prisma.subscription.create({
      data: {
        name: nome,
        planName: col(row, colMap, "plano") || null,
        description: col(row, colMap, "descricao") || null,
        url: col(row, colMap, "url") || null,
        loginUser: col(row, colMap, "loginUser") || null,
        loginType,
        cost: cost && !isNaN(cost) ? cost : null,
        currency,
        billingCycle,
        costCenter: col(row, colMap, "centroCusto") || null,
        team: col(row, colMap, "time") || null,
        responsible: col(row, colMap, "responsavel") || null,
        isActive,
        renewalDate,
        notes: col(row, colMap, "notas") || null,
      },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors });
}
