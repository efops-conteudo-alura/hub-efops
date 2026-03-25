import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpensesOverview } from "./_components/expenses-overview";

export default async function GastosPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return <ExpensesOverview isAdmin={true} />;
}
