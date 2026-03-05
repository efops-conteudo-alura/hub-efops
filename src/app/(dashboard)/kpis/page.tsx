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

async function getAnos() {
  const currentYear = new Date().getFullYear();
  let anos = await prisma.kpiAno.findMany({ orderBy: { year: "desc" } });
  // Garante que o ano corrente existe sempre
  if (!anos.find((a) => a.year === currentYear)) {
    const novo = await prisma.kpiAno.create({ data: { year: currentYear } });
    anos = [novo, ...anos];
  }
  return anos;
}

export default async function KpisPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const currentYear = new Date().getFullYear();

  const [producao, edicao, pesos, levels, anos] = await Promise.all([
    prisma.kpiProducao.findMany({ orderBy: { month: "asc" } }),
    prisma.kpiEdicao.findMany({ orderBy: { month: "asc" } }),
    getPesos(),
    prisma.kpiCarreiraLevel.findMany({ orderBy: [{ carreiraName: "asc" }, { order: "asc" }] }),
    getAnos(),
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
      initialAnos={anos}
      currentYear={currentYear}
    />
  );
}
