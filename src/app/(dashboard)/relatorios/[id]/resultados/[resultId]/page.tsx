import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AiAnaliseResultado } from "../../_components/ai-analise-resultado";

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string; resultId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/home");

  const isAdmin = session.user.role === "ADMIN";

  const { id, resultId } = await params;

  const [report, resultado] = await Promise.all([
    prisma.report.findUnique({ where: { id }, select: { id: true, aiOutputFormat: true, isAdminOnly: true } }),
    prisma.aiAnaliseResult.findUnique({ where: { id: resultId } }),
  ]);

  if (!report || !resultado || resultado.reportId !== id) notFound();
  if (report.isAdminOnly && !isAdmin) redirect("/relatorios");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-2">
      <AiAnaliseResultado
        resultado={{
          id: resultado.id,
          params: resultado.params as Record<string, string>,
          resultado: resultado.resultado,
          resultadoApresentacao: resultado.resultadoApresentacao,
          gammaUrl: resultado.gammaUrl,
          totalRows: resultado.totalRows,
          createdAt: resultado.createdAt.toISOString(),
        }}
        reportId={id}
        outputFormat={report.aiOutputFormat}
      />
    </div>
  );
}
