import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      appRoles: { select: { app: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <UsuariosClient
      initialUsers={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.appRoles.find((r) => r.app === "hub-efops")?.role ?? "USER",
        appRoles: u.appRoles,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
