import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getPesos() {
  const existing = await prisma.kpiPesos.findFirst();
  if (existing) return existing;
  try {
    return await prisma.kpiPesos.create({ data: {} });
  } catch {
    return (await prisma.kpiPesos.findFirst())!;
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pesos = await getPesos();
  return NextResponse.json(pesos);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { curso, artigo, carreira, nivel, trilha } = body;

  const pesos = await getPesos();
  const updated = await prisma.kpiPesos.update({
    where: { id: pesos.id },
    data: {
      ...(curso !== undefined ? { curso: parseFloat(curso) } : {}),
      ...(artigo !== undefined ? { artigo: parseFloat(artigo) } : {}),
      ...(carreira !== undefined ? { carreira: parseFloat(carreira) } : {}),
      ...(nivel !== undefined ? { nivel: parseFloat(nivel) } : {}),
      ...(trilha !== undefined ? { trilha: parseFloat(trilha) } : {}),
    },
  });

  return NextResponse.json(updated);
}
