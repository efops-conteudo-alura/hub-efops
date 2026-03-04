import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { KpisOverview } from "./_components/kpis-overview";

async function getPesos() {
  let pesos = await prisma.kpiPesos.findFirst();
  if (!pesos) {
    pesos = await prisma.kpiPesos.create({ data: {} });
  }
  return pesos;
}

export default async function KpisPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const [producao, edicao, pesos, levels] = await Promise.all([
    prisma.kpiProducao.findMany({ orderBy: { month: "desc" } }),
    prisma.kpiEdicao.findMany({ orderBy: { month: "desc" } }),
    getPesos(),
    prisma.kpiCarreiraLevel.findMany({ orderBy: [{ carreiraName: "asc" }, { order: "asc" }] }),
  ]);

  const serializedLevels = levels.map((l) => ({
    ...l,
    firstPublishedAt: l.firstPublishedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <KpisOverview
      initialProducao={producao}
      initialEdicao={edicao}
      initialPesos={pesos}
      initialLevels={serializedLevels}
    />
  );
}
