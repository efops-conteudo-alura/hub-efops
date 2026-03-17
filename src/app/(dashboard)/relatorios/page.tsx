import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { FileBarChart, Plus } from "lucide-react";
import { ReportCard } from "./_components/report-card";

export default async function RelatoriosPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true, aiResultados: true } } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileBarChart size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              {reports.length} {reports.length === 1 ? "relatório" : "relatórios"} criados
            </p>
          </div>
        </div>
        <Link href="/relatorios/novo">
          <Button>
            <Plus size={16} className="mr-2" /> Novo Relatório
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileBarChart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum relatório criado ainda.</p>
          <p className="text-xs mt-1">Clique em "Novo Relatório" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={{
                ...r,
                createdAt: r.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
