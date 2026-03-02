import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ExpensesOverview } from "./_components/expenses-overview";

export default async function GastosPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "ADMIN";

  return <ExpensesOverview isAdmin={isAdmin} />;
}
