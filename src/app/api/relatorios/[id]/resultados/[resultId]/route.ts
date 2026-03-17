import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resultId } = await params;
  const resultado = await prisma.aiAnaliseResult.findUnique({ where: { id: resultId } });
  if (!resultado || resultado.reportId !== id) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const report = await prisma.report.findUnique({ where: { id }, select: { isAdminOnly: true } });
  if (report?.isAdminOnly && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: resultado.id,
    params: resultado.params,
    resultado: resultado.resultado,
    resultadoApresentacao: resultado.resultadoApresentacao,
    gammaUrl: resultado.gammaUrl,
    totalRows: resultado.totalRows,
    createdAt: resultado.createdAt.toISOString(),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, resultId } = await params;

  const existente = await prisma.aiAnaliseResult.findUnique({ where: { id: resultId }, select: { reportId: true } });
  if (!existente || existente.reportId !== id) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const report = await prisma.report.findUnique({ where: { id }, select: { isAdminOnly: true } });
  if (report?.isAdminOnly && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { resultado } = await request.json();

  if (typeof resultado !== "string" || !resultado.trim()) {
    return NextResponse.json({ error: "Conteúdo inválido" }, { status: 400 });
  }

  const updated = await prisma.aiAnaliseResult.update({
    where: { id: resultId },
    data: { resultado },
  });

  return NextResponse.json({ resultado: updated.resultado });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { resultId } = await params;
  await prisma.aiAnaliseResult.delete({ where: { id: resultId } });
  return new Response(null, { status: 204 });
}
