import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  costCenter: z.enum(["ALURA", "LATAM"]).optional(),
  dataInicio: z.string().nullable().optional(),
  dataConclusao: z.string().nullable().optional(),
  dataGravInicio: z.string().nullable().optional(),
  dataGravFim: z.string().nullable().optional(),
});

function toDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffDias(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const diff = (end.getTime() - start.getTime()) / 86_400_000;
  return diff < 0 ? null : Math.round(diff * 100) / 100;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const current = await prisma.leadtimeTask.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { name, costCenter, dataInicio, dataConclusao, dataGravInicio, dataGravFim } = parsed.data;

  const finalDi = dataInicio !== undefined ? toDate(dataInicio) : current.dataInicio;
  const finalDc = dataConclusao !== undefined ? toDate(dataConclusao) : current.dataConclusao;
  const finalDgi = dataGravInicio !== undefined ? toDate(dataGravInicio) : current.dataGravInicio;
  const finalDgf = dataGravFim !== undefined ? toDate(dataGravFim) : current.dataGravFim;

  try {
    const updated = await prisma.leadtimeTask.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(costCenter !== undefined ? { costCenter } : {}),
        ...(dataInicio !== undefined ? { dataInicio: finalDi } : {}),
        ...(dataConclusao !== undefined ? { dataConclusao: finalDc } : {}),
        ...(dataGravInicio !== undefined ? { dataGravInicio: finalDgi } : {}),
        ...(dataGravFim !== undefined ? { dataGravFim: finalDgf } : {}),
        leadtimeDias: diffDias(finalDi, finalDc),
        leadtimeGravacao: diffDias(finalDgi, finalDgf),
      },
    });
    return NextResponse.json({
      ...updated,
      dataInicio: updated.dataInicio?.toISOString() ?? null,
      dataConclusao: updated.dataConclusao?.toISOString() ?? null,
      dataGravInicio: updated.dataGravInicio?.toISOString() ?? null,
      dataGravFim: updated.dataGravFim?.toISOString() ?? null,
      clickupUpdatedAt: updated.clickupUpdatedAt?.toISOString() ?? null,
      syncedAt: updated.syncedAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.leadtimeTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
