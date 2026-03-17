import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpensesOverview } from "./_components/expenses-overview";

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/home");

  const isAdmin = session.user.role === "ADMIN";

  return <ExpensesOverview isAdmin={isAdmin} />;
}
