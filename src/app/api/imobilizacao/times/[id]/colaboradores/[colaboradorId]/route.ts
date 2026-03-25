import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TIPOS_VALIDOS = ["NORMAL", "LIDER", "ESPECIAL"] as const;
type ColaboradorTipo = typeof TIPOS_VALIDOS[number];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; colaboradorId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { colaboradorId } = await params;
  const body = await req.json();
  const {
    nome,
    clickupUsername,
    matricula,
    cargaHorariaDiaria,
    tipo,
    regraJson,
    ordem,
  } = body;

  if (nome !== undefined && !nome?.trim()) {
    return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 });
  }

  if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (nome !== undefined) data.nome = nome.trim();
  if (clickupUsername !== undefined) data.clickupUsername = clickupUsername?.trim() || null;
  if (matricula !== undefined) data.matricula = matricula?.trim() || null;
  if (cargaHorariaDiaria !== undefined) data.cargaHorariaDiaria = Number(cargaHorariaDiaria);
  if (tipo !== undefined) data.tipo = tipo as ColaboradorTipo;
  if (regraJson !== undefined) data.regraJson = regraJson ? JSON.stringify(regraJson) : null;
  if (ordem !== undefined) data.ordem = Number(ordem);

  const colaborador = await prisma.imobilizacaoColaborador.update({
    where: { id: colaboradorId },
    data,
  });

  return NextResponse.json(colaborador);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; colaboradorId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { colaboradorId } = await params;
  await prisma.imobilizacaoColaborador.delete({ where: { id: colaboradorId } });
  return new Response(null, { status: 204 });
}
