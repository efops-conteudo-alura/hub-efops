import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/kpis/leadtimes/clear
// Apaga todos os registros sincronizados do ClickUp (LeadtimeTask).
// Registros manuais (KpiLeadtime) NÃO são afetados.
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await prisma.leadtimeTask.deleteMany({});
  return NextResponse.json({ success: true, deleted: count });
}
