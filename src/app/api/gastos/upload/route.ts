import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";
import * as XLSX from "xlsx";

const CATEGORY_MAP: Record<string, ExpenseCategory> = {
  editor_freelancer: "EDITOR_FREELANCER",
  editor_externo: "EDITOR_EXTERNO",
  suporte_educacional: "SUPORTE_EDUCACIONAL",
  instrutor: "INSTRUTOR",
};

function parseValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  // Se já é número (células numéricas do Excel)
  if (typeof raw === "number") return raw > 0 ? raw : null;

  const s = String(raw).trim();
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  let normalized: string;
  if (hasComma && hasDot) {
    // "1.200,50" (BR) → remove ponto, vírgula vira ponto
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    const parts = s.split(",");
    // "1,200" (US milhar) vs "1200,50" (BR decimal)
    normalized = parts[1]?.length === 3 ? s.replace(",", "") : s.replace(",", ".");
  } else {
    normalized = s;
  }

  const num = parseFloat(normalized);
  return isNaN(num) || num <= 0 ? null : num;
}

// Gera o template .xlsx em memória
function buildTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["mes", "valor", "categoria", "descricao"],
    ["2026-01", 5000, "editor_freelancer", "João Silva"],
    ["2026-01", 3200, "editor_externo", "Empresa X"],
    ["2026-01", 1800, "suporte_educacional", "Revisão de apostila"],
  ]);
  // Largura das colunas
  ws["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Gastos");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const buffer = buildTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-gastos.xlsx"',
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
  const expectedHeaders = ["mes", "valor", "categoria", "descricao"];
  const hasValidHeader = expectedHeaders.every(
    (h, i) => String(header[i] ?? "").toLowerCase().trim() === h
  );
  if (!hasValidHeader) {
    return NextResponse.json(
      { error: `Cabeçalho inválido. Colunas esperadas: ${expectedHeaders.join(", ")}` },
      { status: 400 }
    );
  }

  // Apaga todas as entradas de upload anteriores antes de inserir as novas
  // (entradas manuais e do ClickUp não são afetadas)
  await prisma.expense.deleteMany({ where: { source: "UPLOAD" } });

  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

    const mes = String(row[0] ?? "").trim();
    const categoriaRaw = String(row[2] ?? "").trim();
    const descricao = row[3] ? String(row[3]).trim() : null;
    const lineNum = i + 2;

    if (!/^\d{4}-\d{2}$/.test(mes)) {
      errors.push(`Linha ${lineNum}: mês inválido "${mes}" (esperado AAAA-MM, ex: 2026-01)`);
      continue;
    }

    const value = parseValue(row[1]);
    if (!value) {
      errors.push(`Linha ${lineNum}: valor inválido "${row[1]}"`);
      continue;
    }

    const category = CATEGORY_MAP[categoriaRaw.toLowerCase()];
    if (!category) {
      errors.push(`Linha ${lineNum}: categoria inválida "${categoriaRaw}". Válidas: ${Object.keys(CATEGORY_MAP).join(", ")}`);
      continue;
    }

    await prisma.expense.create({
      data: { month: mes, value, category, description: descricao, source: "UPLOAD" },
    });
    inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors });
}
