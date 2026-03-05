import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, Key, Bot, Clock, TrendingUp, Users,
  FileText, BookOpen, BarChart2, MessageSquare, AlertCircle,
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const last6Months = getLast6Months();
  const sixMonthsAgo = last6Months[0];
  const in60days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [
    gastosMes,
    gastosUltimos6,
    licencasAtivas,
    renovacoes,
    roiTotals,
    activeAutomations,
    kpiMes,
    totalUsers,
    totalWhitelist,
    teamData,
    processosPublicados,
    docsPublicadas,
    totalRelatorios,
    totalRespostas,
  ] = await Promise.all([
    prisma.expense.aggregate({ where: { month: currentMonth }, _sum: { value: true } }),
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
    prisma.subscription.findMany({
      where: { isActive: true, renewalDate: { gte: today, lte: in60days } },
      select: { name: true, team: true, cost: true, currency: true, renewalDate: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.automation.aggregate({ where: { status: "ACTIVE" }, _sum: { roiHoursSaved: true, roiMonthlySavings: true } }),
    prisma.automation.count({ where: { status: "ACTIVE" } }),
    prisma.kpiProducao.findUnique({ where: { month: currentMonth } }),
    prisma.user.count(),
    prisma.allowedEmail.count(),
    prisma.subscription.groupBy({
      by: ["team"],
      _count: { id: true },
      where: { isActive: true, team: { not: null } },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.process.count({ where: { status: "PUBLISHED" } }),
    prisma.documentation.count({ where: { status: "PUBLISHED" } }),
    prisma.report.count(),
    prisma.reportResponse.count(),
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

  const totalHoras = roiTotals._sum.roiHoursSaved ?? 0;
  const totalEconomia = roiTotals._sum.roiMonthlySavings ?? 0;
  const gastoMesAtual = gastosMes._sum.value ?? 0;

  const maxTeamCount = teamData[0]?._count.id ?? 1;

  return (
    <div className="p-8 max-w-6xl space-y-8">
      <div className="flex items-center gap-3">
        <BarChart2 size={24} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral do Hub — {currentMonth}</p>
        </div>
      </div>

      {/* Linha 1 — Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-950 shrink-0">
                <DollarSign size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xl font-bold leading-tight">{formatBRL(gastoMesAtual)}</p>
                <p className="text-xs text-muted-foreground">gastos externos {currentMonth}</p>
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
                <p className="text-xl font-bold leading-tight">{formatBRL(custoMensalLicencas)}</p>
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
                <div className="flex items-baseline gap-1.5">
                  <p className="text-xl font-bold leading-tight">
                    {totalHoras > 0 ? `${totalHoras}h/sem` : "—"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeAutomations} automações ativas
                  {totalEconomia > 0 && ` · ${formatBRL(totalEconomia)}/mês`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-950 shrink-0">
                <Users size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold leading-tight">{totalUsers} / {totalWhitelist}</p>
                <p className="text-xs text-muted-foreground">contas criadas / lista branca</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2 — Gráficos financeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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
            <CardTitle className="text-sm font-medium flex items-center gap-2">
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

      {/* Linha 3 — KPIs produção + Renovações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={14} className="text-muted-foreground" />
              Produção — {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!kpiMes ? (
              <p className="text-sm text-muted-foreground italic">Sem dados de produção para este mês.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Cursos", value: kpiMes.cursos },
                  { label: "Artigos", value: kpiMes.artigos },
                  { label: "Carreiras", value: kpiMes.carreiras },
                  { label: "Níveis", value: kpiMes.niveis },
                  { label: "Trilhas", value: kpiMes.trilhas },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border p-3 text-center">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle size={14} className="text-muted-foreground" />
              Próximas renovações (60 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renovacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma renovação nos próximos 60 dias.</p>
            ) : (
              <div className="divide-y text-sm">
                {renovacoes.map((r, i) => {
                  const dias = Math.ceil(
                    (new Date(r.renewalDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.team || "Sem time"}</p>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        {r.cost && (
                          <p className="text-xs text-muted-foreground">
                            {r.currency} {r.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <Badge variant={dias <= 15 ? "destructive" : "secondary"} className="text-xs">
                          {dias === 0 ? "hoje" : `${dias}d`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 4 — Inventário do Hub */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Inventário do Hub
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <Clock size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{processosPublicados}</p>
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
                  <p className="text-2xl font-bold">{docsPublicadas}</p>
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
                  <p className="text-2xl font-bold">{totalRelatorios}</p>
                  <p className="text-xs text-muted-foreground">relatórios criados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-muted">
                  <MessageSquare size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRespostas}</p>
                  <p className="text-xs text-muted-foreground">respostas recebidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
