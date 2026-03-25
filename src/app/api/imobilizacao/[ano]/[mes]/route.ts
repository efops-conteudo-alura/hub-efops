import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ ano: string; mes: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ano, mes } = await params;

    const periodo = await prisma.imobilizacaoPeriodo.findUnique({
      where: { ano_mes: { ano: Number(ano), mes: Number(mes) } },
      include: { entries: { orderBy: [{ colaboradorNome: "asc" }, { produtoNome: "asc" }] } },
    });

    if (!periodo) {
      return NextResponse.json({ error: "Período não encontrado" }, { status: 404 });
    }

    return NextResponse.json(periodo);
  } catch (err) {
    console.error("[imobilizacao/[ano]/[mes] GET]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ano, mes } = await params;
    const body = await request.json();
    const { dataInicio, dataFim, feriados, diasUteis } = body;

    const periodo = await prisma.imobilizacaoPeriodo.update({
      where: { ano_mes: { ano: Number(ano), mes: Number(mes) } },
      data: {
        dataInicio: dataInicio ? new Date(dataInicio + "T12:00:00.000Z") : null,
        dataFim: dataFim ? new Date(dataFim + "T12:00:00.000Z") : null,
        feriados: feriados !== undefined ? Number(feriados) : undefined,
        diasUteis: diasUteis !== undefined ? Number(diasUteis) : undefined,
      },
    });

    return NextResponse.json(periodo);
  } catch (err) {
    console.error("[imobilizacao/[ano]/[mes] PUT]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
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

    await prisma.imobilizacaoPeriodo.delete({
      where: { ano_mes: { ano: Number(ano), mes: Number(mes) } },
    });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[imobilizacao/[ano]/[mes] DELETE]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
