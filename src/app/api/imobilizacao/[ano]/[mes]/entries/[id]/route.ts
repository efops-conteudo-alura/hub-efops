import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ ano: string; mes: string; id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.imobilizacaoEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const {
      colaboradorNome,
      colaboradorMatricula,
      cargaHorariaTotal,
      cargaHorariaDiaria,
      produtoTipo,
      produtoId,
      produtoNome,
      horas,
    } = body;

    const entry = await prisma.imobilizacaoEntry.update({
      where: { id },
      data: {
        colaboradorNome: colaboradorNome ?? existing.colaboradorNome,
        colaboradorMatricula: colaboradorMatricula !== undefined ? (colaboradorMatricula || null) : existing.colaboradorMatricula,
        cargaHorariaTotal: cargaHorariaTotal !== undefined ? (cargaHorariaTotal ? Number(cargaHorariaTotal) : null) : existing.cargaHorariaTotal,
        cargaHorariaDiaria: cargaHorariaDiaria !== undefined ? (cargaHorariaDiaria ? Number(cargaHorariaDiaria) : null) : existing.cargaHorariaDiaria,
        produtoTipo: produtoTipo !== undefined ? (produtoTipo || null) : existing.produtoTipo,
        produtoId: produtoId !== undefined ? (produtoId || null) : existing.produtoId,
        produtoNome: produtoNome ?? existing.produtoNome,
        horas: horas !== undefined ? Number(horas) : existing.horas,
      },
    });

    return NextResponse.json(entry);
  } catch (err) {
    console.error("[imobilizacao entries/[id] PUT]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.imobilizacaoEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
    }

    await prisma.imobilizacaoEntry.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[imobilizacao entries/[id] DELETE]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
