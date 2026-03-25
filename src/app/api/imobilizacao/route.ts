import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const periodos = await prisma.imobilizacaoPeriodo.findMany({
      orderBy: [{ ano: "desc" }, { mes: "desc" }],
      select: {
        id: true,
        ano: true,
        mes: true,
        dataInicio: true,
        dataFim: true,
        feriados: true,
        diasUteis: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json(periodos);
  } catch (err) {
    console.error("[imobilizacao GET]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ano, mes, dataInicio, dataFim, feriados, diasUteis } = body;

    if (!ano || !mes) {
      return NextResponse.json({ error: "ano e mes são obrigatórios" }, { status: 400 });
    }

    const existing = await prisma.imobilizacaoPeriodo.findUnique({
      where: { ano_mes: { ano: Number(ano), mes: Number(mes) } },
    });

    if (existing) {
      return NextResponse.json({ error: "Período já existe para esse ano/mês" }, { status: 409 });
    }

    const periodo = await prisma.imobilizacaoPeriodo.create({
      data: {
        ano: Number(ano),
        mes: Number(mes),
        dataInicio: dataInicio ? new Date(dataInicio + "T12:00:00.000Z") : null,
        dataFim: dataFim ? new Date(dataFim + "T12:00:00.000Z") : null,
        feriados: Number(feriados ?? 0),
        diasUteis: Number(diasUteis ?? 0),
      },
    });

    return NextResponse.json(periodo, { status: 201 });
  } catch (err) {
    console.error("[imobilizacao POST]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
