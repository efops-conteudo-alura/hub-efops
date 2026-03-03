import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BillingCycle, LoginType } from "@prisma/client";
import * as XLSX from "xlsx";

const LOGIN_TYPE_MAP: Record<string, LoginType> = {
  senha: "PASSWORD",
  código: "CODE",
  codigo: "CODE",
};

const BILLING_CYCLE_MAP: Record<string, BillingCycle> = {
  mensal: "MONTHLY",
  anual: "ANNUALLY",
  único: "ONE_TIME",
  unico: "ONE_TIME",
  uso: "USAGE",
};

const CURRENCY_VALID = ["BRL", "USD", "EUR"];

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

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/AAAA
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`);
  // AAAA-MM-DD
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return new Date(s);
  // Número serial do Excel
  if (typeof raw === "number") {
    const date = new Date((raw - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export async function GET() {
  const buffer = buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-licencas.xlsx"',
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
  const expectedHeaders = ["nome", "plano", "descricao", "url", "loginUser", "loginType", "custo", "moeda", "ciclo", "centroCusto", "time", "responsavel", "ativa", "dataRenovacao", "notas"];
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

    const loginTypeRaw = String(row[5] ?? "").toLowerCase().trim();
    const loginType: LoginType = LOGIN_TYPE_MAP[loginTypeRaw] ?? "PASSWORD";

    const cicloRaw = String(row[8] ?? "").toLowerCase().trim();
    const billingCycle: BillingCycle = BILLING_CYCLE_MAP[cicloRaw] ?? "MONTHLY";

    const moedaRaw = String(row[7] ?? "BRL").toUpperCase().trim();
    const currency = CURRENCY_VALID.includes(moedaRaw) ? moedaRaw : "BRL";

    const custoRaw = row[6];
    const cost = custoRaw !== undefined && custoRaw !== "" ? parseFloat(String(custoRaw).replace(",", ".")) : null;

    const ativaRaw = String(row[12] ?? "SIM").toLowerCase().trim();
    const isActive = ativaRaw !== "não" && ativaRaw !== "nao" && ativaRaw !== "false";

    const renewalDate = parseDate(row[13]);

    await prisma.subscription.create({
      data: {
        name: nome,
        planName: row[1] ? String(row[1]).trim() : null,
        description: row[2] ? String(row[2]).trim() : null,
        url: row[3] ? String(row[3]).trim() : null,
        loginUser: row[4] ? String(row[4]).trim() : null,
        loginType,
        cost: cost && !isNaN(cost) ? cost : null,
        currency,
        billingCycle,
        costCenter: row[9] ? String(row[9]).trim() : null,
        team: row[10] ? String(row[10]).trim() : null,
        responsible: row[11] ? String(row[11]).trim() : null,
        isActive,
        renewalDate,
        notes: row[14] ? String(row[14]).trim() : null,
      },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors });
}
