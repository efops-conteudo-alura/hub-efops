import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { AiReportBuilder } from "../../_components/ai-report-builder";

export default async function NovaAnaliseIaPage() {
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
          <h1 className="hub-page-title">Análise de IA</h1>
          <p className="text-muted-foreground text-sm">Configure as instruções e parâmetros para o Claude analisar seus dados</p>
        </div>
      </div>
      <AiReportBuilder isAdmin={isAdmin} />
    </div>
  );
}
