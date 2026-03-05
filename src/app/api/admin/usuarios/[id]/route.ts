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
  const { name, password } = await req.json();

  const updateData: { name?: string; password?: string } = {};
  if (name?.trim()) updateData.name = name.trim();
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: updateData });
  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email });
}
