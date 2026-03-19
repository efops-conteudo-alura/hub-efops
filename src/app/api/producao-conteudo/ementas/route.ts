import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analyses = await prisma.ementaAnalise.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      titulo: true,
      autorNome: true,
      createdAt: true,
    },
  });

  return NextResponse.json(analyses);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { titulo, ementaOriginal, avaliacao, sugestaoEmenta } = body;

  if (!titulo?.trim() || !avaliacao?.trim()) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const analise = await prisma.ementaAnalise.create({
    data: {
      titulo: titulo.trim(),
      ementaOriginal: ementaOriginal || "",
      avaliacao,
      sugestaoEmenta: sugestaoEmenta || "",
      autorId: session.user.id,
      autorNome: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json(analise, { status: 201 });
}
