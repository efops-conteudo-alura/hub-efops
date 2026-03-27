import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { FileBarChart, Plus } from "lucide-react";
import { ReportCard } from "./_components/report-card";

export default async function RelatoriosPage() {
  const session = await auth();
  if (!session) redirect("/home");

  const isAdmin = session.user.role === "ADMIN";

  const reports = await prisma.report.findMany({
    where: isAdmin ? undefined : { isAdminOnly: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true, aiResultados: true } } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileBarChart size={28} className="text-muted-foreground" />
          <div>
            <h1 className="hub-page-title">Relatórios</h1>
            <p className="hub-section-title">
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
          <p className="text-sm">Nenhum relatório disponível.</p>
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
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
