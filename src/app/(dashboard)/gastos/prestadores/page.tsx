import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpensesByPrestador } from "../_components/expenses-by-prestador";

export default async function GastosPrestadoresPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return <ExpensesByPrestador />;
}
