import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PesquisaMercadoWrapper } from "./_components/pesquisa-mercado-wrapper";

export default async function PesquisaMercadoPage() {
  const session = await getServerSession(authOptions);

  const pesquisas = session
    ? (
        await prisma.pesquisaMercado.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            assunto: true,
            tipoConteudo: true,
            tipoPesquisa: true,
            autorNome: true,
            createdAt: true,
            resultado: true,
          },
        })
      ).map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))
    : [];

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Pesquisa de Mercado</h1>
      <p className="text-muted-foreground mb-6">
        Gere uma análise de mercado sobre um curso ou carreira com benchmarking de concorrentes e tendências.
      </p>

      <PesquisaMercadoWrapper pesquisasIniciais={pesquisas} />
    </div>
  );
}
