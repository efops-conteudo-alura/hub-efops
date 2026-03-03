import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportBuilder } from "../../_components/report-builder";

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
  const session = await getServerSession(authOptions);
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
          <h1 className="text-2xl font-bold">Editar formulário</h1>
          <p className="text-muted-foreground text-sm">O link público não será alterado</p>
        </div>
      </div>
      <ReportBuilder
        reportId={id}
        initialTitle={report.title}
        initialObjective={report.objective ?? ""}
        initialFields={report.fields as unknown as ReportField[]}
      />
    </div>
  );
}
