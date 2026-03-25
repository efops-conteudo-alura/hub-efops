import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TIPOS_VALIDOS = ["NORMAL", "LIDER", "ESPECIAL"] as const;
type ColaboradorTipo = typeof TIPOS_VALIDOS[number];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const colaboradores = await prisma.imobilizacaoColaborador.findMany({
      where: { timeId: id },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json(colaboradores);
  } catch (err) {
    console.error("[colaboradores GET]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: timeId } = await params;
    const body = await req.json();
    const {
      nome,
      clickupUsername,
      matricula,
      cargaHorariaDiaria = 8,
      tipo = "NORMAL",
      regraJson,
    } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const maxOrdem = await prisma.imobilizacaoColaborador.aggregate({
      where: { timeId },
      _max: { ordem: true },
    });
    const ordem = (maxOrdem._max.ordem ?? -1) + 1;

    const colaborador = await prisma.imobilizacaoColaborador.create({
      data: {
        timeId,
        nome: nome.trim(),
        clickupUsername: clickupUsername?.trim() || null,
        matricula: matricula?.trim() || null,
        cargaHorariaDiaria: Number(cargaHorariaDiaria),
        tipo: tipo as ColaboradorTipo,
        regraJson: regraJson ? JSON.stringify(regraJson) : null,
        ordem,
      },
    });

    return NextResponse.json(colaborador, { status: 201 });
  } catch (err) {
    console.error("[colaboradores POST]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
