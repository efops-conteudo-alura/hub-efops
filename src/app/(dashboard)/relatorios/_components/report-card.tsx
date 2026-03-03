"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, MessageSquare } from "lucide-react";

interface Props {
  report: {
    id: string;
    title: string;
    objective: string | null;
    createdAt: string;
    _count: { responses: number };
  };
}

export function ReportCard({ report }: Props) {
  const date = new Date(report.createdAt).toLocaleDateString("pt-BR");

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <FileSpreadsheet size={18} className="text-primary shrink-0 mt-0.5" />
          <CardTitle className="text-base leading-snug">{report.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        {report.objective && (
          <p className="text-sm text-muted-foreground line-clamp-2">{report.objective}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {report._count.responses} {report._count.responses === 1 ? "resposta" : "respostas"}
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
