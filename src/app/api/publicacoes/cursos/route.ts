import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const monthFrom = searchParams.get("month_from");
  const monthTo = searchParams.get("month_to");
  const categoria = searchParams.get("categoria");
  const catalogo = searchParams.get("catalogo");

  // Base: só cursos de 2025 em diante
  const gteDate = monthFrom ? new Date(`${monthFrom}-01`) : new Date("2025-01-01");

  let lteDate: Date | undefined;
  if (monthTo) {
    const [y, m] = monthTo.split("-").map(Number);
    lteDate = new Date(y, m, 0, 23, 59, 59); // último dia do mês
  }

  const courses = await prisma.aluraCourse.findMany({
    where: {
      // Cursos publicados (statusPub = "pub") ou sem statusPub (legado do sync público)
      OR: [{ statusPub: "pub" }, { statusPub: null }],
      dataCriacao: {
        gte: gteDate,
        ...(lteDate ? { lte: lteDate } : {}),
      },
      ...(categoria ? { categoria } : {}),
      ...(catalogo ? { catalogos: { has: catalogo } } : {}),
    },
    orderBy: { dataCriacao: "desc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      categoria: true,
      instrutores: true,
      instrutor: true,
      cargaHoraria: true,
      dataCriacao: true,
      dataAtualizacao: true,
      catalogos: true,
      isExclusive: true,
      tipo: true,
    },
  });

  return NextResponse.json(courses);
}
