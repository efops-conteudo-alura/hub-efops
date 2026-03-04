import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { month, cursos, artigos, carreiras, trilhas } = body;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const record = await prisma.kpiProducao.update({
    where: { id },
    data: {
      ...(month ? { month } : {}),
      ...(cursos !== undefined ? { cursos: parseInt(cursos) } : {}),
      ...(artigos !== undefined ? { artigos: parseInt(artigos) } : {}),
      ...(carreiras !== undefined ? { carreiras: parseInt(carreiras) } : {}),
      ...(trilhas !== undefined ? { trilhas: parseInt(trilhas) } : {}),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.kpiProducao.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
