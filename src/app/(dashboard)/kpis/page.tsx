import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { KpisOverview } from "./_components/kpis-overview";
import type { LeadtimeTaskRow } from "./_components/leadtime-clickup-panel";

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

  const [
    producao,
    edicao,
    suporte,
    leadtime,
    leadtimeTasksRaw,
    pesos,
    anos,
    gastosInstrutores,
    gastosEditores,
    gastosSuporte,
  ] = await Promise.all([
    prisma.kpiProducao.findMany({ orderBy: { month: "asc" } }),
    prisma.kpiEdicao.findMany({ orderBy: { month: "asc" } }),
    prisma.kpiSuporteEducacional.findMany({ orderBy: { month: "asc" } }),
    prisma.kpiLeadtime.findMany({ orderBy: { dataInicio: "desc" } }),
    prisma.leadtimeTask.findMany({
      orderBy: [{ dataConclusao: "desc" }, { name: "asc" }],
    }),
    getPesos(),
    getAnos(),
    prisma.expense.findMany({
      where: { category: "INSTRUTOR" },
      select: { month: true, value: true, currency: true, exchangeRate: true, costCenter: true },
      orderBy: { month: "asc" },
    }),
    prisma.expense.findMany({
      where: { category: { in: ["EDITOR_FREELANCER", "EDITOR_EXTERNO"] } },
      select: { month: true, value: true, currency: true, exchangeRate: true, costCenter: true },
      orderBy: { month: "asc" },
    }),
    prisma.expense.findMany({
      where: { category: "SUPORTE_EDUCACIONAL" },
      select: { month: true, value: true, currency: true, exchangeRate: true, costCenter: true },
      orderBy: { month: "asc" },
    }),
  ]);

  // Serializa Date → ISO string para o Client Component (Next 16 / RSC)
  const leadtimeTasks: LeadtimeTaskRow[] = leadtimeTasksRaw.map((t) => ({
    id: t.id,
    clickupTaskId: t.clickupTaskId,
    name: t.name,
    listId: t.listId,
    costCenter: t.costCenter,
    dataInicio: t.dataInicio ? t.dataInicio.toISOString() : null,
    dataConclusao: t.dataConclusao ? t.dataConclusao.toISOString() : null,
    leadtimeDias: t.leadtimeDias,
    dataGravInicio: t.dataGravInicio ? t.dataGravInicio.toISOString() : null,
    dataGravFim: t.dataGravFim ? t.dataGravFim.toISOString() : null,
    leadtimeGravacao: t.leadtimeGravacao,
    syncedAt: t.syncedAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <KpisOverview
      initialProducao={producao}
      initialEdicao={edicao}
      initialSuporte={suporte}
      initialLeadtime={leadtime}
      initialLeadtimeTasks={leadtimeTasks}
      initialPesos={pesos}
      initialAnos={anos}
      currentYear={currentYear}
      isAdmin={isAdmin}
      gastosInstrutores={gastosInstrutores}
      gastosEditores={gastosEditores}
      gastosSuporte={gastosSuporte}
    />
  );
}
