import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, password, appRoles } = await req.json();

  const userUpdateData: { name?: string; password?: string } = {};
  if (name?.trim()) userUpdateData.name = name.trim();
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter ao menos 8 caracteres." }, { status: 400 });
    }
    userUpdateData.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(userUpdateData).length === 0 && (!appRoles || appRoles.length === 0)) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: userUpdateData });

  if (Array.isArray(appRoles)) {
    for (const { app, role } of appRoles) {
      if (app && role) {
        await prisma.appRole.upsert({
          where: { userId_app: { userId: id, app } },
          create: { userId: id, app, role },
          update: { role },
        });
      }
    }
  }

  const updatedAppRoles = await prisma.appRole.findMany({ where: { userId: id } });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    appRoles: updatedAppRoles.map((r) => ({ app: r.app, role: r.role })),
  });
}
