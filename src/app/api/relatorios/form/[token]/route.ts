import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ReportField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const report = await prisma.report.findUnique({ where: { token } });
  if (!report) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const { title, objective, fields } = report;
  return NextResponse.json({ title, objective, fields });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const report = await prisma.report.findUnique({ where: { token } });
  if (!report) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  const body = await request.json();
  const data = body.data as Record<string, string> | undefined;

  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Valida campos obrigatórios
  const fields = report.fields as ReportField[];
  const missing = fields.filter((f) => f.required && !data[f.id]?.trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Campos obrigatórios não preenchidos: ${missing.map((f) => f.label).join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.reportResponse.create({
    data: { reportId: report.id, data },
  });

  return NextResponse.json({ success: true });
}
