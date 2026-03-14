import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH: recebe [{ id, ordem }] e atualiza a ordem de múltiplos colaboradores
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: timeId } = await params;
  const body: { id: string; ordem: number }[] = await req.json();

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body deve ser um array" }, { status: 400 });
  }

  await prisma.$transaction(
    body.map(({ id, ordem }) =>
      prisma.imobilizacaoColaborador.update({
        where: { id, timeId },
        data: { ordem },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
