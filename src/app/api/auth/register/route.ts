import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha deve ter ao menos 8 caracteres." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verifica se email está na lista branca
  const allowed = await prisma.allowedEmail.findUnique({ where: { email: normalizedEmail } });
  if (!allowed) {
    return NextResponse.json({ error: "Email não autorizado. Contacte um administrador." }, { status: 403 });
  }

  // Verifica se já tem conta
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Já existe uma conta com este email." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const newUser = await prisma.user.create({
    data: { email: normalizedEmail, name: name.trim(), password: hashed },
  });

  await prisma.appRole.createMany({
    data: [
      { userId: newUser.id, app: "hub-efops", role: "USER" },
      { userId: newUser.id, app: "select-activity", role: "COORDINATOR" },
    ],
  });

  return NextResponse.json({ success: true });
}
