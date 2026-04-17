import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const costCenter = searchParams.get("cost_center");

  const data = await prisma.kpiLeadtime.findMany({
    where: costCenter === "ALURA" || costCenter === "LATAM" ? { costCenter } : {},
    orderBy: { dataInicio: "desc" },
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { costCenter, nome, dataInicio, inicioGravacao, fimGravacao, inicioEdicao, fimEdicao, dataConclusao, instrutor, responsavel } = body;

  if (!nome || !dataInicio) {
    return NextResponse.json({ error: "nome e dataInicio são obrigatórios" }, { status: 400 });
  }

  const record = await prisma.kpiLeadtime.create({
    data: {
      costCenter: costCenter === "LATAM" ? "LATAM" : "ALURA",
      nome,
      dataInicio,
      inicioGravacao: inicioGravacao || null,
      fimGravacao: fimGravacao || null,
      inicioEdicao: inicioEdicao || null,
      fimEdicao: fimEdicao || null,
      dataConclusao: dataConclusao || null,
      instrutor: instrutor || null,
      responsavel: responsavel || null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
