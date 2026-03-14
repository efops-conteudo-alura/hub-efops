import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const time = await prisma.imobilizacaoTime.findUnique({
    where: { id },
    include: { colaboradores: { orderBy: { ordem: "asc" } } },
  });

  if (!time) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(time);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { nome, clickupListId } = body;

  if (!nome?.trim() || !clickupListId?.trim()) {
    return NextResponse.json({ error: "Nome e clickupListId são obrigatórios" }, { status: 400 });
  }

  const time = await prisma.imobilizacaoTime.update({
    where: { id },
    data: { nome: nome.trim(), clickupListId: clickupListId.trim() },
    include: { colaboradores: { orderBy: { ordem: "asc" } } },
  });

  return NextResponse.json(time);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.imobilizacaoTime.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
