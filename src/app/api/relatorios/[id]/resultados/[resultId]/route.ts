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

  const { resultId } = await params;
  const resultado = await prisma.aiAnaliseResult.findUnique({ where: { id: resultId } });
  if (!resultado) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: resultado.id,
    params: resultado.params,
    resultado: resultado.resultado,
    totalRows: resultado.totalRows,
    createdAt: resultado.createdAt.toISOString(),
  });
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
