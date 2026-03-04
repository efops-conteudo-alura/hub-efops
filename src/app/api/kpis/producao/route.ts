import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await prisma.kpiProducao.findMany({
    orderBy: { month: "desc" },
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { month, cursos, artigos, carreiras, trilhas } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const existing = await prisma.kpiProducao.findUnique({ where: { month } });
  if (existing) {
    return NextResponse.json({ error: "Já existe um registro para este mês" }, { status: 409 });
  }

  const record = await prisma.kpiProducao.create({
    data: {
      month,
      cursos: parseInt(cursos) || 0,
      artigos: parseInt(artigos) || 0,
      carreiras: parseInt(carreiras) || 0,
      trilhas: parseInt(trilhas) || 0,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
