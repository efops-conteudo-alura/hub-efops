import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? "";
  const categoria = searchParams.get("categoria");

  const trilhas = await prisma.aluraTrilha.findMany({
    where: {
      ...(search ? { nome: { contains: search, mode: "insensitive" } } : {}),
      ...(categoria ? { categoria } : {}),
    },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      categoria: true,
      numCursos: true,
      cargaHoraria: true,
      createdAt: true,
    },
  });

  return NextResponse.json(trilhas);
}
