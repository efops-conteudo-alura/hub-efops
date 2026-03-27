import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ValidadorForm } from "./_components/validador-form";
import { HistoricoList } from "./_components/historico-list";

export default async function ValidacaoEmentaPage() {
  const session = await auth();

  const analyses = session
    ? (await prisma.ementaAnalise.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, titulo: true, autorNome: true, createdAt: true },
      })).map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="hub-page-title mb-1">Validação de Ementa</h1>
        <p className="hub-section-title">
          Cole a ementa recebida do instrutor para receber uma avaliação e uma sugestão de ementa.
        </p>
      </div>
      <ValidadorForm />
      <HistoricoList analyses={analyses} />
    </div>
  );
}
