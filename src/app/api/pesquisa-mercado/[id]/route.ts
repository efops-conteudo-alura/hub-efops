import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const pesquisa = await prisma.pesquisaMercado.findUnique({ where: { id } });

  if (!pesquisa) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(pesquisa);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.pesquisaMercado.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
