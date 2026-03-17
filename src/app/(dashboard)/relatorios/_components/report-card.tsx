"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, MessageSquare, BrainCircuit, BarChart2, Lock } from "lucide-react";

interface Props {
  report: {
    id: string;
    type: string;
    title: string;
    objective: string | null;
    createdAt: string;
    isAdminOnly: boolean;
    _count: { responses: number; aiResultados: number };
  };
  isAdmin: boolean;
}

export function ReportCard({ report, isAdmin }: Props) {
  const date = new Date(report.createdAt).toLocaleDateString("pt-BR");
  const isAi = report.type === "AI_ANALYSIS";
  const count = isAi ? report._count.aiResultados : report._count.responses;
  const countLabel = isAi
    ? `${count} ${count === 1 ? "análise" : "análises"}`
    : `${count} ${count === 1 ? "resposta" : "respostas"}`;
  const Icon = isAi ? BrainCircuit : FileSpreadsheet;
  const CountIcon = isAi ? BarChart2 : MessageSquare;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Icon size={18} className="text-primary shrink-0 mt-0.5" />
          <CardTitle className="text-base leading-snug flex-1">{report.title}</CardTitle>
          {report.isAdminOnly && isAdmin && (
            <span title="Visível apenas para admins">
              <Lock size={13} className="text-muted-foreground shrink-0 mt-1" />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        {report.objective && (
          <p className="text-sm text-muted-foreground line-clamp-2">{report.objective}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CountIcon size={12} />
            {countLabel}
          </span>
          <span>{date}</span>
        </div>
        <Link href={`/relatorios/${report.id}`}>
          <Button size="sm" className="w-full">Ver relatório</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
