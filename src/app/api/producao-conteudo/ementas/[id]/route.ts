import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const analise = await prisma.ementaAnalise.findUnique({ where: { id } });

  if (!analise) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(analise);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.ementaAnalise.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
