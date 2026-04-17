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
  const { costCenter, nome, dataInicio, inicioGravacao, fimGravacao, inicioEdicao, fimEdicao, dataConclusao, instrutor, responsavel } = body;

  const record = await prisma.kpiLeadtime.update({
    where: { id },
    data: {
      ...(costCenter ? { costCenter: costCenter === "LATAM" ? "LATAM" : "ALURA" } : {}),
      ...(nome !== undefined ? { nome } : {}),
      ...(dataInicio !== undefined ? { dataInicio } : {}),
      ...(inicioGravacao !== undefined ? { inicioGravacao: inicioGravacao || null } : {}),
      ...(fimGravacao !== undefined ? { fimGravacao: fimGravacao || null } : {}),
      ...(inicioEdicao !== undefined ? { inicioEdicao: inicioEdicao || null } : {}),
      ...(fimEdicao !== undefined ? { fimEdicao: fimEdicao || null } : {}),
      ...(dataConclusao !== undefined ? { dataConclusao: dataConclusao || null } : {}),
      ...(instrutor !== undefined ? { instrutor: instrutor || null } : {}),
      ...(responsavel !== undefined ? { responsavel: responsavel || null } : {}),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.kpiLeadtime.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
