import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CATALOGO_BB = "exclusivo-banco-do-brasil";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { month } = body as { month?: string };

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month inválido (esperado YYYY-MM)" }, { status: 400 });
  }

  const [yearNum, monthNum] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
  const endDate = new Date(Date.UTC(yearNum, monthNum, 1));

  const [cursos, artigos] = await Promise.all([
    prisma.aluraCourse.count({
      where: {
        dataPublicacao: { gte: startDate, lt: endDate },
        statusPub: { in: ["pub", "PUBLISHED"] },
        catalogos: { hasSome: ["alura", "tech-marketing"] },
        NOT: { catalogos: { has: CATALOGO_BB } },
      },
    }),
    prisma.aluraArtigo.count({
      where: {
        dataPublicacao: { gte: startDate, lt: endDate },
        OR: [
          { autor: null },
          { autor: { not: "Fabrício Carraro" } },
        ],
      },
    }),
  ]);

  return NextResponse.json({ cursos, artigos, month });
}
