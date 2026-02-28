import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Bot, GitBranch, BookOpen, ArrowRight, Clock, DollarSign } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  const [
    activeSubCount,
    activeSubsForCost,
    totalAutomations,
    activeAutomations,
    recentAutomations,
    recentSubscriptions,
  ] = await Promise.all([
    prisma.subscription.count({ where: { isActive: true } }),
    prisma.subscription.findMany({
      where: { isActive: true },
      select: { cost: true, billingCycle: true },
    }),
    prisma.automation.count(),
    prisma.automation.count({ where: { status: "ACTIVE" } }),
    prisma.automation.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, type: true, status: true, shortDesc: true, creator: true },
    }),
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, name: true, team: true, cost: true, currency: true, isActive: true },
    }),
  ]);

  const totalMonthly = activeSubsForCost.reduce((acc, s) => {
    if (!s.cost) return acc;
    if (s.billingCycle === "MONTHLY") return acc + s.cost;
    if (s.billingCycle === "ANNUALLY") return acc + s.cost / 12;
    return acc;
  }, 0);

  const automationHours = await prisma.automation.aggregate({
    _sum: { roiHoursSaved: true },
  });
  const totalHours = automationHours._sum.roiHoursSaved ?? 0;

  const STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Em teste" };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Bem-vindo, {session?.user?.name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground mt-1">EO Hub — Eficiência Operacional do time de conteúdo.</p>
      </div>

      {/* Feature cards */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Módulos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">

        {/* Licenças */}
        <Link href="/assinaturas">
          <Card className="hover:border-blue-400 transition-colors cursor-pointer h-full overflow-hidden">
            <div className="h-1.5 bg-blue-500" />
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                      <Key size={18} className="text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-base">Licenças</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gestão de assinaturas e ferramentas do departamento.
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{activeSubCount}</p>
                      <p className="text-xs text-muted-foreground">licenças ativas</p>
                    </div>
                    {totalMonthly > 0 && (
                      <div>
                        <p className="text-2xl font-bold">
                          R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-muted-foreground">custo mensal est.</p>
                      </div>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Automações */}
        <Link href="/automacoes">
          <Card className="hover:border-purple-400 transition-colors cursor-pointer h-full overflow-hidden">
            <div className="h-1.5 bg-purple-500" />
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                      <Bot size={18} className="text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-base">Automações & Agentes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Portfólio de automações, agentes de IA e calculadora de ROI.
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{activeAutomations}</p>
                      <p className="text-xs text-muted-foreground">ativas</p>
                    </div>
                    {totalHours > 0 && (
                      <div>
                        <p className="text-2xl font-bold">{totalHours}h</p>
                        <p className="text-xs text-muted-foreground">economizadas/semana</p>
                      </div>
                    )}
                    {totalAutomations === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma cadastrada ainda</p>
                    )}
                  </div>
                </div>
                <ArrowRight size={18} className="text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Processos */}
        <Link href="/processos">
          <Card className="hover:border-orange-400 transition-colors cursor-pointer h-full overflow-hidden">
            <div className="h-1.5 bg-orange-400" />
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950">
                      <GitBranch size={18} className="text-orange-600" />
                    </div>
                    <h3 className="font-semibold text-base">Processos & Fluxos</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Mapeamento e documentação de processos operacionais.
                  </p>
                  <Badge variant="outline" className="text-xs">Em breve</Badge>
                </div>
                <ArrowRight size={18} className="text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Documentações */}
        <Link href="/documentacoes">
          <Card className="hover:border-green-400 transition-colors cursor-pointer h-full overflow-hidden">
            <div className="h-1.5 bg-green-500" />
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                      <BookOpen size={18} className="text-green-600" />
                    </div>
                    <h3 className="font-semibold text-base">Documentações</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Base de conhecimento e referências do time.
                  </p>
                  <Badge variant="outline" className="text-xs">Em breve</Badge>
                </div>
                <ArrowRight size={18} className="text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Últimas atualizações */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Últimas atualizações</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Últimas automações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot size={15} className="text-purple-500" />
              Automações & Agentes recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAutomations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma automação cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {recentAutomations.map((a) => (
                  <Link key={a.id} href={`/automacoes/${a.id}`} className="flex items-center justify-between hover:opacity-70 transition-opacity">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.type === "AGENT" ? "Agente de IA" : "Automação"}{a.creator ? ` · ${a.creator}` : ""}</p>
                    </div>
                    <Badge variant={a.status === "ACTIVE" ? "default" : "secondary"} className="text-xs ml-2 shrink-0">
                      {STATUS_LABELS[a.status]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/automacoes" className="flex items-center gap-1 mt-4 text-xs text-primary hover:underline">
              Ver todas <ArrowRight size={11} />
            </Link>
          </CardContent>
        </Card>

        {/* Licenças recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key size={15} className="text-blue-500" />
              Licenças recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSubscriptions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma licença cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {recentSubscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.team || "Sem time"}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {s.cost && (
                        <span className="text-xs text-muted-foreground">
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
            <Link href="/assinaturas" className="flex items-center gap-1 mt-4 text-xs text-primary hover:underline">
              Ver todas <ArrowRight size={11} />
            </Link>
          </CardContent>
        </Card>

        {/* Processos - placeholder */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <GitBranch size={15} />
              Processos & Fluxos recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Disponível em breve.</p>
          </CardContent>
        </Card>

        {/* Documentações - placeholder */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <BookOpen size={15} />
              Documentações recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Disponível em breve.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
