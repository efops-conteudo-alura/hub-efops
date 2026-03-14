import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const times = await prisma.imobilizacaoTime.findMany({
    orderBy: { ordem: "asc" },
    include: {
      colaboradores: { orderBy: { ordem: "asc" } },
      _count: { select: { entries: true } },
    },
  });

  return NextResponse.json(times);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { nome, clickupListId, clickupListIdsAdicionais } = body;

  if (!nome?.trim() || !clickupListId?.trim()) {
    return NextResponse.json({ error: "Nome e clickupListId são obrigatórios" }, { status: 400 });
  }

  const maxOrdem = await prisma.imobilizacaoTime.aggregate({ _max: { ordem: true } });
  const ordem = (maxOrdem._max.ordem ?? -1) + 1;

  const time = await prisma.imobilizacaoTime.create({
    data: {
      nome: nome.trim(),
      clickupListId: clickupListId.trim(),
      clickupListIdsAdicionais: clickupListIdsAdicionais?.trim() || null,
      ordem,
    },
    include: { colaboradores: true },
  });

  return NextResponse.json(time, { status: 201 });
}
