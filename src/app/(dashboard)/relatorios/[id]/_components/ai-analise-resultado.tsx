"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Printer } from "lucide-react";

interface AiResultado {
  id: string;
  params: Record<string, string>;
  resultado: string;
  totalRows: number | null;
  createdAt: string;
}

interface AiAnaliseResultadoProps {
  resultado: AiResultado;
  outputFormat: string;
  onBack: () => void;
}

export function AiAnaliseResultado({ resultado, outputFormat, onBack }: AiAnaliseResultadoProps) {
  const html = useMemo(() => marked(resultado.resultado) as string, [resultado.resultado]);

  function formatPeriod() {
    if (resultado.params.periodoInicio && resultado.params.periodoFim) {
      const ini = new Date(resultado.params.periodoInicio).toLocaleDateString("pt-BR");
      const fim = new Date(resultado.params.periodoFim).toLocaleDateString("pt-BR");
      return `${ini} – ${fim}`;
    }
    return resultado.params.arquivoNome ?? "Análise";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="font-medium text-sm">{formatPeriod()}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(resultado.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
              })}
              {resultado.totalRows != null && ` · ${resultado.totalRows} respostas`}
            </p>
          </div>
        </div>
        {outputFormat === "pdf" || true ? (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={13} className="mr-1.5" />
            Exportar PDF
          </Button>
        ) : null}
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          .border { border: none !important; }
          .rounded-lg { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

