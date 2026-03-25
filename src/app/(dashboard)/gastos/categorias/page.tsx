import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpensesByCategory } from "../_components/expenses-by-category";

export default async function GastosCategoriasPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return <ExpensesByCategory />;
}
