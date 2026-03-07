import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
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
    },
  });

  return NextResponse.json(trilhas);
}
