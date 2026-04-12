import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha deve ter ao menos 8 caracteres." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    // Este endpoint é exclusivo para migração — só funciona se ainda não tem senha
    if (user.password) {
      return NextResponse.json(
        { error: "Esta conta já tem senha. Use as opções de recuperação no login." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
