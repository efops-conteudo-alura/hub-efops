import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, Key, Bot, TrendingUp,
  FileText, BookOpen, BarChart2, Clock,
} from "lucide-react";
import { GastosChart, type GastosChartRow } from "./_components/gastos-chart";
import { DashboardFilter } from "./_components/dashboard-filter";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatMonthShort(m: string) {
  const [year, month] = m.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]}/${year}`;
}

function getNMonthsAgo(today: Date, n: number): string {
  const d = new Date(today.getFullYear(), today.getMonth() - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthStr(today: Date, offset = 0): string {
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildYearMonths(year: number, upToMonth?: number): string[] {
  const limit = upToMonth ?? 12;
  return Array.from({ length: limit }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, "0")}`
  );
}

type FilterConfig = {
  gastoCardMonths: string[];
  chartMonths: string[];
  kpiMonths: string[];
  gastoCardLabel: string;
  chartLabel: string;
  kpiLabel: string;
  periodoLabel: string;
};

function getFilterConfig(periodo: string | null, today: Date): FilterConfig {
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  if (periodo === "mes-atual") {
    const m = getMonthStr(today);
    const label = formatMonthShort(m);
    return {
      gastoCardMonths: [m],
      chartMonths: [m],
      kpiMonths: [m],
      gastoCardLabel: `gastos externos — ${label}`,
      chartLabel: `Gastos externos — ${label}`,
      kpiLabel: `Produção — ${label}`,
      periodoLabel: label,
    };
  }

  if (periodo === "mes-passado") {
    const m = getMonthStr(today, -1);
    const label = formatMonthShort(m);
    return {
      gastoCardMonths: [m],
      chartMonths: [m],
      kpiMonths: [m],
      gastoCardLabel: `gastos externos — ${label}`,
      chartLabel: `Gastos externos — ${label}`,
      kpiLabel: `Produção — ${label}`,
      periodoLabel: label,
    };
  }

  if (periodo === "ano-atual") {
    const months = buildYearMonths(currentYear, currentMonthNum);
    const label = String(currentYear);
    return {
      gastoCardMonths: months,
      chartMonths: months,
      kpiMonths: months,
      gastoCardLabel: `gastos externos — ${label}`,
      chartLabel: `Gastos externos — ${label}`,
      kpiLabel: `Produção — ${label}`,
      periodoLabel: label,
    };
  }

  if (periodo === "ano-passado") {
    const year = currentYear - 1;
    const months = buildYearMonths(year);
    const label = String(year);
    return {
      gastoCardMonths: months,
      chartMonths: months,
      kpiMonths: months,
      gastoCardLabel: `gastos externos — ${label}`,
      chartLabel: `Gastos externos — ${label}`,
      kpiLabel: `Produção — ${label}`,
      periodoLabel: label,
    };
  }

  // default — sem filtro
  const last6: string[] = [];
  for (let i = 5; i >= 0; i--) last6.push(getNMonthsAgo(today, i));
  const last3 = last6.slice(3);

  return {
    gastoCardMonths: last3,
    chartMonths: last6,
    kpiMonths: last3,
    gastoCardLabel: "gastos externos — últimos 3 meses",
    chartLabel: "Gastos externos — últimos 6 meses",
    kpiLabel: `Produção — últimos 3 meses (${last3[0]} a ${last3[2]})`,
    periodoLabel: "",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const params = await searchParams;
  const periodo = params.periodo ?? null;

  const today = new Date();
  const currentMonth = getMonthStr(today);

  const cfg = getFilterConfig(periodo, today);

  const chartGte = cfg.chartMonths[0];
  const chartLte = cfg.chartMonths[cfg.chartMonths.length - 1];

  const [
    gastosCard,
    gastosChart,
    licencasAtivas,
    roiTotals,
    activeAutomations,
    kpiData,
    teamData,
    processosPublicados,
    docsPublicadas,
    totalRelatorios,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: { month: { in: cfg.gastoCardMonths } },
      _sum: { value: true },
    }),
    prisma.expense.groupBy({
      by: ["month", "category"],
      where: { month: { gte: chartGte, lte: chartLte } },
      _sum: { value: true },
      orderBy: { month: "asc" },
    }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { cost: true, billingCycle: true, team: true },
    }),
    prisma.automation.aggregate({ where: { status: "ACTIVE" }, _sum: { roiHoursSaved: true, roiMonthlySavings: true } }),
    prisma.automation.count({ where: { status: "ACTIVE" } }),
    prisma.kpiProducao.findMany({ where: { month: { in: cfg.kpiMonths } } }),
    prisma.subscription.groupBy({
      by: ["team"],
      _count: { id: true },
      where: { isActive: true, team: { not: null } },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.process.count({ where: { status: "PUBLISHED" } }),
    prisma.documentation.count({ where: { status: "PUBLISHED" } }),
    prisma.report.count(),
  ]);

  // Custo mensal de licenças
  const custoMensalLicencas = licencasAtivas.reduce((acc, s) => {
    if (!s.cost) return acc;
    if (s.billingCycle === "MONTHLY") return acc + s.cost;
    if (s.billingCycle === "ANNUALLY") return acc + s.cost / 12;
    return acc;
  }, 0);

  // Gráfico de gastos
  const gastosMap: Record<string, Record<string, number>> = {};
  for (const g of gastosChart) {
    if (!gastosMap[g.month]) gastosMap[g.month] = {};
    gastosMap[g.month][g.category] = (g._sum.value ?? 0);
  }
  const gastosChartData: GastosChartRow[] = cfg.chartMonths.map((month) => ({
    month,
    ...(gastosMap[month] ?? {}),
  }));

  // KPI produção
  const kpiTotais = kpiData.reduce(
    (acc, k) => ({
      cursos: acc.cursos + k.cursos,
      artigos: acc.artigos + k.artigos,
      carreiras: acc.carreiras + k.carreiras,
      niveis: acc.niveis + k.niveis,
      trilhas: acc.trilhas + k.trilhas,
    }),
    { cursos: 0, artigos: 0, carreiras: 0, niveis: 0, trilhas: 0 }
  );

  const totalHoras = roiTotals._sum.roiHoursSaved ?? 0;
  const totalEconomia = roiTotals._sum.roiMonthlySavings ?? 0;
  const gastosTotal = gastosCard._sum.value ?? 0;

  const maxTeamCount = teamData[0]?._count.id ?? 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 size={24} className="text-muted-foreground" />
          <div>
            <h1 className="hub-page-title">Dashboard</h1>
            <p className="hub-section-title">
              {periodo ? `Visão geral — ${cfg.periodoLabel}` : `Visão geral do Hub — ${currentMonth}`}
            </p>
          </div>
        </div>
        <DashboardFilter active={periodo} />
      </div>

      {/* Linha 1 — Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-950 shrink-0">
                <DollarSign size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xl hub-number leading-tight">{formatBRL(gastosTotal)}</p>
                <p className="text-xs text-muted-foreground">{cfg.gastoCardLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950 shrink-0">
                <Key size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xl hub-number leading-tight">{formatBRL(custoMensalLicencas)}</p>
                <p className="text-xs text-muted-foreground">custo licenças/mês est.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-950 shrink-0">
                <Bot size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xl hub-number leading-tight">
                  {totalHoras > 0 ? `${totalHoras}h/sem` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeAutomations} automações ativas
                  {totalEconomia > 0 && ` · ${formatBRL(totalEconomia)}/mês`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2 — Gráficos financeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="hub-card-title flex items-center gap-2">
              <DollarSign size={14} className="text-muted-foreground" />
              {cfg.chartLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GastosChart data={gastosChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="hub-card-title flex items-center gap-2">
              <Key size={14} className="text-muted-foreground" />
              Licenças ativas por time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum dado disponível.</p>
            ) : (
              <div className="space-y-3">
                {teamData.map((t) => (
                  <div key={t.team} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{t.team}</span>
                      <span className="font-medium ml-2 shrink-0">{t._count.id}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(t._count.id / maxTeamCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3 — KPIs de produção */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="hub-card-title flex items-center gap-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            {cfg.kpiLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpiData.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sem dados de produção para este período.</p>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Cursos", value: kpiTotais.cursos },
                { label: "Artigos", value: kpiTotais.artigos },
                { label: "Carreiras", value: kpiTotais.carreiras },
                { label: "Níveis", value: kpiTotais.niveis },
                { label: "Trilhas", value: kpiTotais.trilhas },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md border p-3 text-center">
                  <p className="text-2xl hub-number">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 4 — Inventário do Hub */}
      <div>
        <h2 className="text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Inventário do Hub
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Clock size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl hub-number">{processosPublicados}</p>
                  <p className="text-xs text-muted-foreground">processos publicados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <BookOpen size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl hub-number">{docsPublicadas}</p>
                  <p className="text-xs text-muted-foreground">docs publicadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <FileText size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl hub-number">{totalRelatorios}</p>
                  <p className="text-xs text-muted-foreground">relatórios criados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
