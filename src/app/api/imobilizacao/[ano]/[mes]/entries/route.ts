import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ ano: string; mes: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ano, mes } = await params;

    const periodo = await prisma.imobilizacaoPeriodo.findUnique({
      where: { ano_mes: { ano: Number(ano), mes: Number(mes) } },
    });

    if (!periodo) {
      return NextResponse.json({ error: "Período não encontrado" }, { status: 404 });
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
      timeId,
    } = body;

    if (!colaboradorNome || !produtoNome) {
      return NextResponse.json({ error: "colaboradorNome e produtoNome são obrigatórios" }, { status: 400 });
    }

    const entry = await prisma.imobilizacaoEntry.create({
      data: {
        periodoId: periodo.id,
        timeId: timeId || null,
        colaboradorNome,
        colaboradorMatricula: colaboradorMatricula || null,
        cargaHorariaTotal: cargaHorariaTotal ? Number(cargaHorariaTotal) : null,
        cargaHorariaDiaria: cargaHorariaDiaria ? Number(cargaHorariaDiaria) : null,
        produtoTipo: produtoTipo || null,
        produtoId: produtoId || null,
        produtoNome,
        horas: Number(horas ?? 0),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("[imobilizacao entries POST]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
