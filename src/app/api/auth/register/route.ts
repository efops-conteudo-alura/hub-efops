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

  // Verifica se já tem conta (criada por outro hub)
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Garante que o usuário existente tenha acesso aos dois hubs como COORDINATOR
    await Promise.all([
      prisma.appRole.upsert({
        where: { userId_app: { userId: existing.id, app: "hub-efops" } },
        create: { userId: existing.id, app: "hub-efops", role: "USER" },
        update: {},
      }),
      prisma.appRole.upsert({
        where: { userId_app: { userId: existing.id, app: "hub-producao-conteudo" } },
        create: { userId: existing.id, app: "hub-producao-conteudo", role: "COORDINATOR" },
        update: {},
      }),
    ]);
    return NextResponse.json({ success: true, existing: true });
  }

  const hashed = await bcrypt.hash(password, 12);
  const newUser = await prisma.user.create({
    data: { email: normalizedEmail, name: name.trim(), password: hashed },
  });

  await prisma.appRole.createMany({
    data: [
      { userId: newUser.id, app: "hub-efops", role: "USER" },
      { userId: newUser.id, app: "hub-producao-conteudo", role: "COORDINATOR" },
    ],
  });

  return NextResponse.json({ success: true });
}
