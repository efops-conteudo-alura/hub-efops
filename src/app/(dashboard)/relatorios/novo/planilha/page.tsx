import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportBuilder } from "../../_components/report-builder";

export default async function NovaPlanilhaPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/relatorios/novo" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Planilha & Formulário</h1>
          <p className="text-muted-foreground text-sm">Defina os campos e o objetivo do relatório</p>
        </div>
      </div>
      <ReportBuilder />
    </div>
  );
}
