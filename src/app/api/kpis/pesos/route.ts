import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getPesos() {
  let pesos = await prisma.kpiPesos.findFirst();
  if (!pesos) {
    pesos = await prisma.kpiPesos.create({ data: {} });
  }
  return pesos;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pesos = await getPesos();
  return NextResponse.json(pesos);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { curso, artigo, carreira, trilha } = body;

  const pesos = await getPesos();
  const updated = await prisma.kpiPesos.update({
    where: { id: pesos.id },
    data: {
      ...(curso !== undefined ? { curso: parseFloat(curso) } : {}),
      ...(artigo !== undefined ? { artigo: parseFloat(artigo) } : {}),
      ...(carreira !== undefined ? { carreira: parseFloat(carreira) } : {}),
      ...(trilha !== undefined ? { trilha: parseFloat(trilha) } : {}),
    },
  });

  return NextResponse.json(updated);
}
