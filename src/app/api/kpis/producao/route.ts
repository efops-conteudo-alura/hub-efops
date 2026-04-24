import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await prisma.kpiProducao.findMany({
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
  const { month, costCenter, cursos, artigos, carreiras, niveis, trilhas } = body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const cc: "ALURA" | "LATAM" = costCenter === "LATAM" ? "LATAM" : "ALURA";

  const existing = await prisma.kpiProducao.findUnique({
    where: { month_costCenter: { month, costCenter: cc } },
  });
  if (existing) {
    return NextResponse.json({ error: "Já existe um registro para este mês" }, { status: 409 });
  }

  const record = await prisma.kpiProducao.create({
    data: {
      month,
      costCenter: cc,
      cursos: parseInt(cursos) || 0,
      artigos: parseInt(artigos) || 0,
      carreiras: parseInt(carreiras) || 0,
      niveis: parseInt(niveis) || 0,
      trilhas: parseInt(trilhas) || 0,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
