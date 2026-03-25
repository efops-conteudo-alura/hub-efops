import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await prisma.allowedEmail.findMany({ orderBy: { createdAt: "desc" } });

  // Descobre quais já têm conta
  const emails = allowed.map((a) => a.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const withAccount = new Set(users.map((u) => u.email));

  const result = allowed.map((a) => ({ ...a, hasAccount: withAccount.has(a.email) }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const rawEmails: string[] = Array.isArray(body.emails) ? body.emails : [];

  const normalized = rawEmails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Nenhum email válido fornecido." }, { status: 400 });
  }

  // Descobre quais já existem
  const existing = await prisma.allowedEmail.findMany({
    where: { email: { in: normalized } },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((e) => e.email));
  const toCreate = normalized.filter((e) => !existingSet.has(e));

  if (toCreate.length > 0) {
    await prisma.allowedEmail.createMany({
      data: toCreate.map((email) => ({ email })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({
    added: toCreate.length,
    alreadyExisted: normalized.length - toCreate.length,
  });
}
