import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportBuilder } from "../../_components/report-builder";

export default async function NovaPlanilhaPage() {
  const session = await auth();
  if (!session) redirect("/home");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/relatorios/novo" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="hub-page-title">Planilha & Formulário</h1>
          <p className="text-muted-foreground text-sm">Defina os campos e o objetivo do relatório</p>
        </div>
      </div>
      <ReportBuilder isAdmin={isAdmin} />
    </div>
  );
}
