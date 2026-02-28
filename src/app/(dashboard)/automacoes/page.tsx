import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Bot, Zap, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewAutomationDialog } from "./new-automation-dialog";

const TYPE_LABELS = { AUTOMATION: "Automação", AGENT: "Agente de IA" };
const STATUS_LABELS = { ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Em teste" };
const STATUS_VARIANTS = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  TESTING: "outline",
} as const;

function AutomationThumbnail({ url, type }: { url: string | null; type: string }) {
  if (url) {
    return <img src={url} alt="" className="w-full h-32 object-cover rounded-t-lg" />;
  }
  return (
    <div className={`w-full h-32 rounded-t-lg flex items-center justify-center ${type === "AGENT" ? "bg-purple-100 dark:bg-purple-950" : "bg-blue-100 dark:bg-blue-950"}`}>
      {type === "AGENT"
        ? <Bot size={40} className="text-purple-500" />
        : <Zap size={40} className="text-blue-500" />}
    </div>
  );
}

export default async function AutomacoesPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const automations = await prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalActive = automations.filter((a) => a.status === "ACTIVE").length;
  const totalHours = automations.reduce((acc, a) => acc + (a.roiHoursSaved || 0), 0);
  const totalSavings = automations.reduce((acc, a) => acc + (a.roiMonthlySavings || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bot size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Automações & Agentes</h1>
            <p className="text-muted-foreground">
              {automations.length} {automations.length === 1 ? "item" : "itens"} cadastrados
            </p>
          </div>
        </div>
        {isAdmin && <NewAutomationDialog />}
      </div>

      {automations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-950">
                <Bot size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-xs text-muted-foreground">ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950">
                <Clock size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHours}h</p>
                <p className="text-xs text-muted-foreground">economizadas/semana</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-950">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {totalSavings.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">economia mensal est.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {automations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Bot size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">Nenhuma automação ou agente cadastrado</p>
          {isAdmin && <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Automação / Agente" para começar.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((a) => (
            <Link key={a.id} href={`/automacoes/${a.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer overflow-hidden h-full flex flex-col">
                <AutomationThumbnail url={a.thumbnailUrl} type={a.type} />
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={a.type === "AGENT" ? "outline" : "secondary"} className="text-xs">
                      {TYPE_LABELS[a.type]}
                    </Badge>
                    <Badge variant={STATUS_VARIANTS[a.status]} className="text-xs">
                      {STATUS_LABELS[a.status]}
                    </Badge>
                  </div>
                  <p className="font-semibold leading-tight">{a.name}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0">
                  {a.shortDesc && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{a.shortDesc}</p>
                  )}
                  <div className="space-y-2 mt-auto">
                    {a.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.tools.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs py-0">{t}</Badge>
                        ))}
                        {a.tools.length > 3 && (
                          <Badge variant="outline" className="text-xs py-0">+{a.tools.length - 3}</Badge>
                        )}
                      </div>
                    )}
                    {a.creator && (
                      <p className="text-xs text-muted-foreground">por {a.creator}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
