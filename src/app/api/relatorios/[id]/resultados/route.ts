import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const report = await prisma.report.findUnique({ where: { id }, select: { isAdminOnly: true } });
  if (!report) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (report.isAdminOnly && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resultados = await prisma.aiAnaliseResult.findMany({
    where: { reportId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(resultados.map((r) => ({
    id: r.id,
    params: r.params,
    resultado: r.resultado,
    resultadoApresentacao: r.resultadoApresentacao,
    gammaUrl: r.gammaUrl,
    totalRows: r.totalRows,
    createdAt: r.createdAt.toISOString(),
  })));
}
