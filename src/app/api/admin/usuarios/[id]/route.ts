import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  const { name, password, appRoles } = body;

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

  const KNOWN_APPS = ["hub-efops", "hub-producao-conteudo"];
  const KNOWN_ROLES: Record<string, string[]> = {
    "hub-efops": ["USER", "ADMIN"],
    "hub-producao-conteudo": ["USER", "COORDINATOR", "INSTRUCTOR", "ADMIN"],
  };

  if (Array.isArray(appRoles)) {
    // Upsert roles enviados — ignora combinações app/role inválidas
    for (const { app, role } of appRoles) {
      if (!KNOWN_APPS.includes(app) || !KNOWN_ROLES[app]?.includes(role)) continue;
      await prisma.appRole.upsert({
        where: { userId_app: { userId: id, app } },
        create: { userId: id, app, role },
        update: { role },
      });
    }

    // Remover roles de apps conhecidos que vieram como "Sem acesso"
    const submittedApps = appRoles.map((r: { app: string }) => r.app);
    const appsToRemove = KNOWN_APPS.filter((app) => !submittedApps.includes(app));
    if (appsToRemove.length > 0) {
      await prisma.appRole.deleteMany({
        where: { userId: id, app: { in: appsToRemove } },
      });
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
