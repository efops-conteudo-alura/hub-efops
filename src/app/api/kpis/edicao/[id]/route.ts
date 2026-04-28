import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { month, correcoes, entregasConteudo, entregasStart, entregasLatam, entregasMarketing, entregasOutras } = body;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  try {
    const record = await prisma.kpiEdicao.update({
      where: { id },
      data: {
        ...(month ? { month } : {}),
        ...(correcoes !== undefined ? { correcoes: parseInt(correcoes) } : {}),
        ...(entregasConteudo !== undefined ? { entregasConteudo: parseInt(entregasConteudo) } : {}),
        ...(entregasStart !== undefined ? { entregasStart: parseInt(entregasStart) } : {}),
        ...(entregasLatam !== undefined ? { entregasLatam: parseInt(entregasLatam) } : {}),
        ...(entregasMarketing !== undefined ? { entregasMarketing: parseInt(entregasMarketing) } : {}),
        ...(entregasOutras !== undefined ? { entregasOutras: parseInt(entregasOutras) } : {}),
      },
    });
    return NextResponse.json(record);
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.kpiEdicao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
