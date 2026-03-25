import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportTypePicker } from "../_components/report-type-picker";

export default async function NovoRelatorioPage() {
  const session = await auth();
  if (!session) redirect("/home");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/relatorios" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Relatório</h1>
          <p className="text-muted-foreground text-sm">Escolha o tipo de relatório</p>
        </div>
      </div>
      <ReportTypePicker />
    </div>
  );
}
