import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anos = await prisma.kpiAno.findMany({ orderBy: { year: "desc" } });
  return NextResponse.json(anos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year } = await req.json();
  if (!year || typeof year !== "number" || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Ano inválido." }, { status: 400 });
  }

  const existing = await prisma.kpiAno.findUnique({ where: { year } });
  if (existing) {
    return NextResponse.json({ error: "Ano já existe." }, { status: 409 });
  }

  const novo = await prisma.kpiAno.create({ data: { year } });
  return NextResponse.json(novo, { status: 201 });
}
