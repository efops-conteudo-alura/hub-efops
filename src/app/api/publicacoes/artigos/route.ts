import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const monthFrom = searchParams.get("month_from");
  const monthTo = searchParams.get("month_to");
  const categoria = searchParams.get("categoria");

  const gteDate = monthFrom ? new Date(`${monthFrom}-01`) : new Date("2025-01-01");

  let lteDate: Date | undefined;
  if (monthTo) {
    const [y, m] = monthTo.split("-").map(Number);
    lteDate = new Date(y, m, 0, 23, 59, 59);
  }

  const artigos = await prisma.aluraArtigo.findMany({
    where: {
      dataPublicacao: {
        gte: gteDate,
        ...(lteDate ? { lte: lteDate } : {}),
      },
      ...(categoria ? { categoria } : {}),
    },
    orderBy: { dataPublicacao: "desc" },
    select: {
      id: true,
      slug: true,
      nome: true,
      autor: true,
      categoria: true,
      dataPublicacao: true,
      dataModificacao: true,
    },
  });

  return NextResponse.json(artigos);
}
