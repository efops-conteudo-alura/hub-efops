import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, Key, Bot, TrendingUp,
  FileText, BookOpen, BarChart2, Clock,
} from "lucide-react";
import { GastosChart, type GastosChartRow } from "./_components/gastos-chart";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getLast6Months(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function getLast3Months(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const last6Months = getLast6Months();
  const last3Months = getLast3Months();
  const sixMonthsAgo = last6Months[0];

  const [
    gastosUltimos3,
    gastosUltimos6,
    licencasAtivas,
    roiTotals,
    activeAutomations,
    kpiUltimos3,
    teamData,
    processosPublicados,
    docsPublicadas,
    totalRelatorios,
  ] = await Promise.all([
    prisma.expense.aggregate({ where: { month: { in: last3Months } }, _sum: { value: true } }),
    prisma.expense.groupBy({
      by: ["month", "category"],
      where: { month: { gte: sixMonthsAgo } },
      _sum: { value: true },
      orderBy: { month: "asc" },
    }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { cost: true, billingCycle: true, team: true },
    }),
    prisma.automation.aggregate({ where: { status: "ACTIVE" }, _sum: { roiHoursSaved: true, roiMonthlySavings: true } }),
    prisma.automation.count({ where: { status: "ACTIVE" } }),
    prisma.kpiProducao.findMany({ where: { month: { in: last3Months } } }),
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

  // Gráfico de gastos — transformar groupBy em rows por mês
  const gastosMap: Record<string, Record<string, number>> = {};
  for (const g of gastosUltimos6) {
    if (!gastosMap[g.month]) gastosMap[g.month] = {};
    gastosMap[g.month][g.category] = (g._sum.value ?? 0);
  }
  const gastosChartData: GastosChartRow[] = last6Months.map((month) => ({
    month,
    ...(gastosMap[month] ?? {}),
  }));

  // KPI produção — soma dos últimos 3 meses
  const kpiTotais = kpiUltimos3.reduce(
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
  const gastosTotal3Meses = gastosUltimos3._sum.value ?? 0;

  const maxTeamCount = teamData[0]?._count.id ?? 1;

  return (
    <div className="p-8 max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <BarChart2 size={24} className="text-muted-foreground" />
        <div>
          <h1 className="hub-page-title">Dashboard</h1>
          <p className="hub-section-title">Visão geral do Hub — {currentMonth}</p>
        </div>
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
                <p className="text-xl hub-number leading-tight">{formatBRL(gastosTotal3Meses)}</p>
                <p className="text-xs text-muted-foreground">gastos externos — últimos 3 meses</p>
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
              Gastos externos — últimos 6 meses
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
            Produção — últimos 3 meses ({last3Months[0]} a {last3Months[2]})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpiUltimos3.length === 0 ? (
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
