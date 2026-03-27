import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportBuilder } from "../../_components/report-builder";
import { AiReportBuilder } from "../../_components/ai-report-builder";

interface ReportField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

export default async function EditarRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/relatorios/${id}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="hub-page-title">
            {report.type === "AI_ANALYSIS" ? "Editar análise de IA" : "Editar formulário"}
          </h1>
          {report.type !== "AI_ANALYSIS" && (
            <p className="text-muted-foreground text-sm">O link público não será alterado</p>
          )}
        </div>
      </div>

      {report.type === "AI_ANALYSIS" ? (
        <AiReportBuilder
          reportId={id}
          initialTitle={report.title}
          initialObjective={report.objective ?? ""}
          initialInstructions={report.aiInstructions ?? ""}
          initialNeedsFile={report.aiNeedsFile}
          initialNeedsDate={report.aiNeedsDate}
          initialOutputFormat={report.aiOutputFormat}
          initialNeedsClickup={report.aiNeedsClickup}
          initialClickupListIds={report.aiClickupListIds ?? ""}
          initialHasPresentation={report.aiHasPresentation}
          initialIsAdminOnly={report.isAdminOnly}
          isAdmin={true}
        />
      ) : (
        <ReportBuilder
          reportId={id}
          initialTitle={report.title}
          initialObjective={report.objective ?? ""}
          initialFields={report.fields as unknown as ReportField[]}
          initialIsAdminOnly={report.isAdminOnly}
          isAdmin={true}
        />
      )}
    </div>
  );
}
