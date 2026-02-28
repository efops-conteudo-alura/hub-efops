import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, DollarSign, Package, Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const [totalCount, activeCount, inactiveCount, recentSubscriptions, activeSubscriptions, teamData] =
    await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { isActive: false } }),
      prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          team: true,
          cost: true,
          currency: true,
          billingCycle: true,
          isActive: true,
        },
      }),
      prisma.subscription.findMany({
        where: { isActive: true },
        select: { cost: true, billingCycle: true },
      }),
      prisma.subscription.groupBy({
        by: ["team"],
        _count: { id: true },
        where: { isActive: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

  const totalMonthly = activeSubscriptions.reduce((acc, s) => {
    if (!s.cost) return acc;
    if (s.billingCycle === "MONTHLY") return acc + s.cost;
    if (s.billingCycle === "ANNUALLY") return acc + s.cost / 12;
    return acc;
  }, 0);

  const BILLING_LABELS: Record<string, string> = {
    MONTHLY: "Mensal",
    ANNUALLY: "Anual",
    ONE_TIME: "Único",
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {session?.user?.name}!
          </p>
        </div>
        <Button asChild>
          <Link href="/assinaturas/nova">
            <Plus size={16} className="mr-2" />
            Nova Assinatura
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package size={16} />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">assinaturas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">em uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle size={16} className="text-red-500" />
              Inativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{inactiveCount}</div>
            <p className="text-xs text-muted-foreground mt-1">desativadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={16} />
              Custo Mensal Est.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R${" "}
              {totalMonthly.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">apenas em BRL</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Adicionadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubscriptions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma assinatura cadastrada
                </p>
              )}
              {recentSubscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.team || "Sem time"} •{" "}
                      {BILLING_LABELS[s.billingCycle] || s.billingCycle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.cost && (
                      <span className="text-xs text-muted-foreground">
                        {s.currency}{" "}
                        {s.cost.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    <Badge
                      variant={s.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {s.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinaturas por Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamData.filter((t) => t.team).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum dado disponível
                </p>
              )}
              {teamData
                .filter((t) => t.team)
                .map((t) => (
                  <div
                    key={t.team}
                    className="flex items-center justify-between"
                  >
                    <p className="text-sm">{t.team}</p>
                    <Badge variant="outline">
                      {t._count.id}{" "}
                      {t._count.id !== 1 ? "assinaturas" : "assinatura"}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
