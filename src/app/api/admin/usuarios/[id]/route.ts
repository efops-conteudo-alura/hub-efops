import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admins";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, password, role } = await req.json();

  const userUpdateData: { name?: string; password?: string } = {};
  if (name?.trim()) userUpdateData.name = name.trim();
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }
    userUpdateData.password = await bcrypt.hash(password, 12);
  }

  const hasRoleUpdate = role === "USER" || role === "ADMIN";

  if (Object.keys(userUpdateData).length === 0 && !hasRoleUpdate) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: userUpdateData });

  if (hasRoleUpdate) {
    await prisma.appRole.upsert({
      where: { userId_app: { userId: id, app: "hub-efops" } },
      create: { userId: id, app: "hub-efops", role },
      update: { role },
    });
  }

  const appRole = await prisma.appRole.findUnique({
    where: { userId_app: { userId: id, app: "hub-efops" } },
  });

  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, role: appRole?.role ?? "USER" });
}
