import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, CheckCircle, XCircle, DollarSign,
  Bot, Clock, TrendingUp, BarChart2, Key,
} from "lucide-react";

export default async function DashboardPage() {
  await getServerSession(authOptions);

  const [
    totalSubs,
    activeSubs,
    inactiveSubs,
    activeSubsForCost,
    teamData,
    recentSubscriptions,
    totalAutomations,
    activeAutomations,
    automationAgg,
    recentAutomations,
  ] = await Promise.all([
    prisma.subscription.count(),
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.subscription.count({ where: { isActive: false } }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { cost: true, billingCycle: true, currency: true },
    }),
    prisma.subscription.groupBy({
      by: ["team"],
      _count: { id: true },
      where: { isActive: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, team: true, cost: true, currency: true, billingCycle: true, isActive: true },
    }),
    prisma.automation.count(),
    prisma.automation.count({ where: { status: "ACTIVE" } }),
    prisma.automation.aggregate({
      _sum: { roiHoursSaved: true, roiMonthlySavings: true },
    }),
    prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, type: true, status: true, roiHoursSaved: true, roiMonthlySavings: true },
    }),
  ]);

  const totalMonthly = activeSubsForCost.reduce((acc, s) => {
    if (!s.cost) return acc;
    if (s.billingCycle === "MONTHLY") return acc + s.cost;
    if (s.billingCycle === "ANNUALLY") return acc + s.cost / 12;
    return acc;
  }, 0);

  const totalHours = automationAgg._sum.roiHoursSaved ?? 0;
  const totalSavings = automationAgg._sum.roiMonthlySavings ?? 0;

  const BILLING_LABELS: Record<string, string> = { MONTHLY: "Mensal", ANNUALLY: "Anual", ONE_TIME: "Único" };
  const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Em teste" };

  // For CSS bar chart: find max team count
  const teamDataFiltered = teamData.filter((t) => t.team);
  const maxTeamCount = teamDataFiltered[0]?._count.id ?? 1;

  // Automation type breakdown
  const agentCount = recentAutomations.filter((a) => a.type === "AGENT").length;
  const automationTypeCount = recentAutomations.filter((a) => a.type === "AUTOMATION").length;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-center gap-3">
        <BarChart2 size={26} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral de métricas e indicadores.</p>
        </div>
      </div>

      {/* Licenças - stat cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <Key size={13} /> Licenças
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted"><Package size={16} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{totalSubs}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-950"><CheckCircle size={16} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeSubs}</p>
                <p className="text-xs text-muted-foreground">ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-950"><XCircle size={16} className="text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold text-red-500">{inactiveSubs}</p>
                <p className="text-xs text-muted-foreground">inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950"><DollarSign size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-xl font-bold">
                  R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">custo mensal est.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automações - stat cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
        <Bot size={13} /> Automações & Agentes
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-950"><Bot size={16} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalAutomations}</p>
                <p className="text-xs text-muted-foreground">total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-950"><CheckCircle size={16} className="text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeAutomations}</p>
                <p className="text-xs text-muted-foreground">ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950"><Clock size={16} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{totalHours > 0 ? `${totalHours}h` : "—"}</p>
                <p className="text-xs text-muted-foreground">economizadas/semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-950"><TrendingUp size={16} className="text-emerald-600" /></div>
              <div>
                <p className="text-xl font-bold">
                  {totalSavings > 0
                    ? `R$ ${totalSavings.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">economia mensal est.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Licenças por time - CSS bar chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Licenças ativas por time</CardTitle>
          </CardHeader>
          <CardContent>
            {teamDataFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              <div className="space-y-3">
                {teamDataFiltered.map((t) => (
                  <div key={t.team} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[180px]">{t.team}</span>
                      <span className="font-medium ml-2 shrink-0">{t._count.id}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(t._count.id / maxTeamCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automações - últimas com ROI */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Automações — ROI por item</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAutomations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma automação cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {recentAutomations.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{STATUS_LABELS[a.status]}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-2 shrink-0 text-right">
                      {a.roiHoursSaved ? (
                        <div>
                          <p className="text-sm font-semibold">{a.roiHoursSaved}h</p>
                          <p className="text-xs text-muted-foreground">/sem</p>
                        </div>
                      ) : null}
                      {a.roiMonthlySavings ? (
                        <div>
                          <p className="text-sm font-semibold text-emerald-600">
                            R$ {a.roiMonthlySavings.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                          </p>
                          <p className="text-xs text-muted-foreground">/mês</p>
                        </div>
                      ) : null}
                      {!a.roiHoursSaved && !a.roiMonthlySavings && (
                        <span className="text-xs text-muted-foreground">Sem ROI</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas licenças */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Últimas licenças adicionadas</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma licença cadastrada.</p>
          ) : (
            <div className="divide-y">
              {recentSubscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.team || "Sem time"} · {BILLING_LABELS[s.billingCycle] || s.billingCycle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.cost && (
                      <span className="text-sm text-muted-foreground">
                        {s.currency} {s.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">
                      {s.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
