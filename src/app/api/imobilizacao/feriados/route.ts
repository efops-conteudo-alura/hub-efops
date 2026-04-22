import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  if (!ano) {
    return NextResponse.json({ error: "Parâmetro 'ano' obrigatório" }, { status: 400 });
  }
  const feriados = await prisma.feriadoAlura.findMany({
    where: { ano: parseInt(ano) },
    orderBy: { data: "asc" },
  });
  return NextResponse.json(feriados);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { ano, data, descricao } = body;
  if (!ano || !data || !descricao?.trim()) {
    return NextResponse.json({ error: "Campos obrigatórios: ano, data, descricao" }, { status: 400 });
  }
  const feriado = await prisma.feriadoAlura.create({
    data: {
      ano: parseInt(ano),
      data: new Date(data + "T12:00:00.000Z"),
      descricao: descricao.trim(),
    },
  });
  return NextResponse.json(feriado, { status: 201 });
}
