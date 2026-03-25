import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      OR: [{ statusPub: "pub" }, { statusPub: "PUBLISHED" }, { statusPub: null }],
      dataPublicacao: {
        gte: gteDate,
        ...(lteDate ? { lte: lteDate } : {}),
      },
      ...(categoria ? { categoria } : {}),
      ...(catalogo ? { catalogos: { has: catalogo } } : {}),
    },
    orderBy: { dataPublicacao: "desc" },
    select: {
      id: true,
      aluraId: true,
      slug: true,
      nome: true,
      categoria: true,
      instrutores: true,
      instrutor: true,
      cargaHoraria: true,
      dataPublicacao: true,
      catalogos: true,
      subcategorias: true,
      isExclusive: true,
      tipo: true,
    },
  });

  return NextResponse.json(courses);
}
