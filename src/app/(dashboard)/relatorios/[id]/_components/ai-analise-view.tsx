"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Play, Trash2, Eye, FileText, Pencil } from "lucide-react";
import Link from "next/link";
import { AiAnaliseDialog } from "./ai-analise-dialog";
import { AiAnaliseResultado } from "./ai-analise-resultado";

interface AiAnaliseReport {
  id: string;
  title: string;
  objective: string | null;
  aiNeedsFile: boolean;
  aiNeedsDate: boolean;
  aiOutputFormat: string;
}

interface AiResultado {
  id: string;
  params: Record<string, string>;
  resultado: string;
  resultadoApresentacao: string | null;
  gammaUrl: string | null;
  totalRows: number | null;
  createdAt: string;
}

interface AiAnaliseViewProps {
  report: AiAnaliseReport;
  resultados: AiResultado[];
}

export function AiAnaliseView({ report, resultados: initialResultados }: AiAnaliseViewProps) {
  const router = useRouter();
  const [resultados, setResultados] = useState<AiResultado[]>(initialResultados);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewResultado, setViewResultado] = useState<AiResultado | null>(null);
  const [deletingReport, setDeletingReport] = useState(false);

  async function handleDeleteReport() {
    if (!confirm(`Excluir o relatório "${report.title}" e todo o histórico de análises? Esta ação não pode ser desfeita.`)) return;
    setDeletingReport(true);
    await fetch(`/api/relatorios/${report.id}`, { method: "DELETE" });
    router.push("/relatorios");
  }

  function handleNewResultado(resultado: AiResultado) {
    setResultados((prev) => [resultado, ...prev]);
    setViewResultado(resultado);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta análise?")) return;
    await fetch(`/api/relatorios/${report.id}/resultados/${id}`, { method: "DELETE" });
    setResultados((prev) => prev.filter((r) => r.id !== id));
    if (viewResultado?.id === id) setViewResultado(null);
  }

  function formatPeriod(params: Record<string, string>) {
    if (params.periodoInicio && params.periodoFim) {
      const ini = new Date(params.periodoInicio + "T12:00:00").toLocaleDateString("pt-BR");
      const fim = new Date(params.periodoFim + "T12:00:00").toLocaleDateString("pt-BR");
      return `${ini} – ${fim}`;
    }
    return params.arquivoNome ?? "—";
  }

  if (viewResultado) {
    return (
      <AiAnaliseResultado
        resultado={viewResultado}
        reportId={report.id}
        outputFormat={report.aiOutputFormat}
        onBack={() => setViewResultado(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit size={20} className="text-primary" />
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <Badge variant="secondary" className="text-xs">Análise de IA</Badge>
          </div>
          {report.objective && (
            <p className="text-muted-foreground text-sm">{report.objective}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/relatorios/${report.id}/editar`}>
              <Pencil size={13} className="mr-1.5" />
              Editar
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDeleteReport}
            disabled={deletingReport}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {resultados.length === 0 ? (
        <div className="border rounded-lg p-12 text-center space-y-3">
          <FileText size={40} className="mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">Nenhuma análise executada ainda.</p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Play size={13} className="mr-1.5" />
            Executar primeira análise
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Histórico de análises</h2>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Play size={13} className="mr-1.5" />
              Nova análise
            </Button>
          </div>
          {resultados.map((r) => (
            <div
              key={r.id}
              className="border rounded-lg p-4 flex items-center justify-between gap-4 bg-card"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium truncate">{formatPeriod(r.params)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {r.totalRows != null && <span>{r.totalRows} respostas</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setViewResultado(r)}>
                  <Eye size={13} className="mr-1.5" />
                  Ver
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AiAnaliseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={report}
        onSuccess={handleNewResultado}
      />
    </div>
  );
}
