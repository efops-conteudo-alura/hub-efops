import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Bot, Zap, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewAutomationDialog } from "./new-automation-dialog";
import { AutomacaoUploadButton } from "./_components/upload-button";

const STATUS_LABELS = { ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Em teste" };
const STATUS_VARIANTS = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  TESTING: "outline",
} as const;

function AutomationThumbnail({ url, type }: { url: string | null; type: string }) {
  const isAgent = type === "AGENT";
  const Icon = isAgent ? Bot : Zap;
  const iconColor = isAgent ? "text-purple-500" : "text-blue-500";
  const bgColor = isAgent ? "bg-purple-100 dark:bg-purple-950" : "bg-blue-100 dark:bg-blue-950";
  const badgeBg = isAgent ? "bg-purple-500" : "bg-blue-500";

  return (
    <div className="relative w-full h-20 overflow-hidden rounded-t-lg">
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${bgColor}`}>
          <Icon size={36} className={iconColor} />
        </div>
      )}
      <div className={`absolute bottom-2 left-2 ${badgeBg} rounded-full p-1.5 shadow`}>
        <Icon size={14} className="text-white" />
      </div>
    </div>
  );
}

export default async function AutomacoesPage() {
  const session = await auth();
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
        {isAdmin && (
          <div className="flex gap-2">
            <AutomacaoUploadButton />
            <NewAutomationDialog />
          </div>
        )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {automations.map((a) => (
            <Link key={a.id} href={`/automacoes/${a.id}`} className="h-full">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex flex-col h-full">
                <AutomationThumbnail url={a.thumbnailUrl} type={a.type} />
                <CardContent className="pt-3 pb-3 flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={STATUS_VARIANTS[a.status]} className="text-xs">{STATUS_LABELS[a.status]}</Badge>
                    {a.creator && <p className="text-xs text-muted-foreground truncate ml-2">por {a.creator}</p>}
                  </div>
                  <p className="font-semibold leading-tight line-clamp-1">{a.name}</p>
                  {a.shortDesc && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.shortDesc}</p>
                  )}
                  {a.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.tools.slice(0, 2).map((t) => (
                        <Badge key={t} variant="outline" className="text-xs py-0">{t}</Badge>
                      ))}
                      {a.tools.length > 2 && (
                        <Badge variant="outline" className="text-xs py-0">+{a.tools.length - 2}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
