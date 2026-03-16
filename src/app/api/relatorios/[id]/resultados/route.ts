import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resultados = await prisma.aiAnaliseResult.findMany({
    where: { reportId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(resultados.map((r) => ({
    id: r.id,
    params: r.params,
    resultado: r.resultado,
    totalRows: r.totalRows,
    createdAt: r.createdAt.toISOString(),
  })));
}
