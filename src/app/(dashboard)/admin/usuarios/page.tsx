import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/super-admins";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const superAdmin = isSuperAdmin(session.user.email);

  return (
    <UsuariosClient
      initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      isSuperAdmin={superAdmin}
    />
  );
}
