import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, image, currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const data: { name?: string; image?: string | null; password?: string } = {};

  if (name && String(name).trim()) data.name = String(name).trim();
  if (image !== undefined) data.image = image || null;

  // Alteração de senha: qualquer usuário com senha pode alterar a própria
  if (newPassword) {
    if (!user.password) {
      return NextResponse.json({ error: "Este usuário não tem senha definida" }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
    }
    if (String(newPassword).length < 8) {
      return NextResponse.json({ error: "A nova senha deve ter ao menos 8 caracteres" }, { status: 400 });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }
    data.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, image: true },
  });

  return NextResponse.json(updated);
}
