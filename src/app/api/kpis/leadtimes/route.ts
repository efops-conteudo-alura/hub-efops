import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/kpis/leadtimes?regiao=ALURA|LATAM
// Retorna as tasks sincronizadas do ClickUp com leadtime calculado.
// Sem filtro = todas as regiões.
const querySchema = z.object({
  regiao: z.enum(["ALURA", "LATAM"]).optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    regiao: searchParams.get("regiao") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const where = parsed.data.regiao ? { regiao: parsed.data.regiao } : {};

  const tasks = await prisma.leadtimeTask.findMany({
    where,
    orderBy: [
      { dataConclusao: "desc" },
      { name: "asc" },
    ],
  });

  return NextResponse.json(tasks);
}
