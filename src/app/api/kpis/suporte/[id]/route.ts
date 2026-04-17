import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { month, topicosRespondidos, slaMedio, artigosCriados, artigosRevisados, imersoes } = body;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  const record = await prisma.kpiSuporteEducacional.update({
    where: { id },
    data: {
      ...(month ? { month } : {}),
      ...(topicosRespondidos !== undefined ? { topicosRespondidos: parseInt(topicosRespondidos) } : {}),
      ...(slaMedio !== undefined ? { slaMedio: parseFloat(slaMedio) } : {}),
      ...(artigosCriados !== undefined ? { artigosCriados: parseInt(artigosCriados) } : {}),
      ...(artigosRevisados !== undefined ? { artigosRevisados: parseInt(artigosRevisados) } : {}),
      ...(imersoes !== undefined ? { imersoes: parseInt(imersoes) } : {}),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.kpiSuporteEducacional.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
