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
  const { month, costCenter, cursos, artigos, carreiras, niveis, trilhas } = body;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  try {
    const record = await prisma.kpiProducao.update({
      where: { id },
      data: {
        ...(month ? { month } : {}),
        ...(costCenter === "ALURA" || costCenter === "LATAM" ? { costCenter } : {}),
        ...(cursos !== undefined ? { cursos: parseInt(cursos) } : {}),
        ...(artigos !== undefined ? { artigos: parseInt(artigos) } : {}),
        ...(carreiras !== undefined ? { carreiras: parseInt(carreiras) } : {}),
        ...(niveis !== undefined ? { niveis: parseInt(niveis) } : {}),
        ...(trilhas !== undefined ? { trilhas: parseInt(trilhas) } : {}),
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
    await prisma.kpiProducao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
