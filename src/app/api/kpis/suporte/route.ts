import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await prisma.kpiSuporteEducacional.findMany({
    orderBy: { month: "desc" },
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { month, topicosRespondidos, slaMedio, artigosCriados, artigosRevisados, imersoes } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const existing = await prisma.kpiSuporteEducacional.findUnique({ where: { month } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um registro para este mês" }, { status: 409 });
  }

  const record = await prisma.kpiSuporteEducacional.create({
    data: {
      month,
      topicosRespondidos: parseInt(topicosRespondidos) || 0,
      slaMedio: parseFloat(slaMedio) || 0,
      artigosCriados: parseInt(artigosCriados) || 0,
      artigosRevisados: parseInt(artigosRevisados) || 0,
      imersoes: parseInt(imersoes) || 0,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
