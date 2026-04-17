import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session) redirect("/home");

  const isAdmin = session.user.role === "ADMIN";
  const currentYear = new Date().getFullYear();

  const [producao, edicao, pesos, anos, gastosInstrutores, gastosEditores] = await Promise.all([
    prisma.kpiProducao.findMany({ orderBy: { month: "asc" } }),
    prisma.kpiEdicao.findMany({ orderBy: { month: "asc" } }),
    getPesos(),
    getAnos(),
    prisma.expense.findMany({
      where: { category: "INSTRUTOR", costCenter: "ALURA" },
      select: { month: true, value: true, currency: true, exchangeRate: true },
      orderBy: { month: "asc" },
    }),
    prisma.expense.findMany({
      where: { category: { in: ["EDITOR_FREELANCER", "EDITOR_EXTERNO"] }, costCenter: "ALURA" },
      select: { month: true, value: true, currency: true, exchangeRate: true },
      orderBy: { month: "asc" },
    }),
  ]);

  return (
    <KpisOverview
      initialProducao={producao}
      initialEdicao={edicao}
      initialPesos={pesos}
      initialAnos={anos}
      currentYear={currentYear}
      isAdmin={isAdmin}
      gastosInstrutores={gastosInstrutores}
      gastosEditores={gastosEditores}
    />
  );
}
