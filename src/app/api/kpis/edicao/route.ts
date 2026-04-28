import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await prisma.kpiEdicao.findMany({
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
  const { month, correcoes, entregasConteudo, entregasStart, entregasLatam, entregasMarketing, entregasOutras } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const existing = await prisma.kpiEdicao.findUnique({ where: { month } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um registro para este mês" }, { status: 409 });
  }

  const record = await prisma.kpiEdicao.create({
    data: {
      month,
      correcoes: parseInt(correcoes) || 0,
      entregasConteudo: parseInt(entregasConteudo) || 0,
      entregasStart: parseInt(entregasStart) || 0,
      entregasLatam: parseInt(entregasLatam) || 0,
      entregasMarketing: parseInt(entregasMarketing) || 0,
      entregasOutras: parseInt(entregasOutras) || 0,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
