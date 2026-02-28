import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={session.user} isAdmin={isAdmin} />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">{children}</main>
    </div>
  );
}
