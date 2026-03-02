import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  // Busca dados frescos do DB para refletir atualizações de perfil
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });

  const user = {
    name: dbUser?.name ?? session.user.name,
    email: session.user.email,
    image: dbUser?.image ?? null,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} isAdmin={isAdmin} />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">{children}</main>
    </div>
  );
}
