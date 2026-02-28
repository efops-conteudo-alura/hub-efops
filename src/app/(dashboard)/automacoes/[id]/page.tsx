import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Zap, Clock, TrendingUp, Wrench, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAutomationButton } from "./delete-button";

const TYPE_LABELS = { AUTOMATION: "Automação", AGENT: "Agente de IA" };
const STATUS_LABELS = { ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Em teste" };
const STATUS_VARIANTS = { ACTIVE: "default", INACTIVE: "secondary", TESTING: "outline" } as const;

export default async function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const { id } = await params;

  const automation = await prisma.automation.findUnique({ where: { id } });
  if (!automation) notFound();

  const hasRoi = automation.roiHoursSaved || automation.roiMonthlySavings || automation.roiDescription;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/automacoes">
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Link>
        </Button>
        {isAdmin && <DeleteAutomationButton id={automation.id} />}
      </div>

      <div className="flex items-start gap-4 mb-8">
        {automation.thumbnailUrl ? (
          <img src={automation.thumbnailUrl} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
        ) : (
          <div className={`w-20 h-20 rounded-lg flex items-center justify-center shrink-0 ${automation.type === "AGENT" ? "bg-purple-100 dark:bg-purple-950" : "bg-blue-100 dark:bg-blue-950"}`}>
            {automation.type === "AGENT"
              ? <Bot size={32} className="text-purple-500" />
              : <Zap size={32} className="text-blue-500" />}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant={automation.type === "AGENT" ? "outline" : "secondary"}>
              {TYPE_LABELS[automation.type]}
            </Badge>
            <Badge variant={STATUS_VARIANTS[automation.status]}>
              {STATUS_LABELS[automation.status]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold">{automation.name}</h1>
          {automation.shortDesc && (
            <p className="text-muted-foreground mt-1">{automation.shortDesc}</p>
          )}
          {automation.creator && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <User size={14} /> por {automation.creator}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {automation.fullDesc && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição completa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{automation.fullDesc}</p>
            </CardContent>
          </Card>
        )}

        {automation.tools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench size={16} /> Ferramentas utilizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {automation.tools.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasRoi && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} /> ROI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(automation.roiHoursSaved || automation.roiMonthlySavings) && (
                <div className="grid grid-cols-2 gap-4">
                  {automation.roiHoursSaved && (
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Clock size={16} />
                        <span className="text-xs font-medium">Horas economizadas</span>
                      </div>
                      <p className="text-2xl font-bold">{automation.roiHoursSaved}h</p>
                      <p className="text-xs text-muted-foreground">por semana</p>
                    </div>
                  )}
                  {automation.roiMonthlySavings && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-4">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <TrendingUp size={16} />
                        <span className="text-xs font-medium">Economia mensal est.</span>
                      </div>
                      <p className="text-2xl font-bold">
                        R$ {automation.roiMonthlySavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">estimativa</p>
                    </div>
                  )}
                </div>
              )}
              {automation.roiDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed">{automation.roiDescription}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
