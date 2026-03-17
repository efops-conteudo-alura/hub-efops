"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Printer, Presentation, ExternalLink, Loader2, Link2 } from "lucide-react";

interface AiResultado {
  id: string;
  params: Record<string, string>;
  resultado: string;
  resultadoApresentacao: string | null;
  gammaUrl: string | null;
  totalRows: number | null;
  createdAt: string;
}

interface AiAnaliseResultadoProps {
  resultado: AiResultado;
  reportId: string;
  outputFormat: string;
  onBack?: () => void;
}

export function AiAnaliseResultado({ resultado, reportId, outputFormat, onBack }: AiAnaliseResultadoProps) {
  const router = useRouter();
  const html = useMemo(() => marked(resultado.resultado) as string, [resultado.resultado]);
  const [gammaUrl, setGammaUrl] = useState<string | null>(resultado.gammaUrl);
  const [gammaLoading, setGammaLoading] = useState(false);
  const [gammaError, setGammaError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.push(`/relatorios/${reportId}`);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/relatorios/${reportId}/resultados/${resultado.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExportGamma() {
    setGammaLoading(true);
    setGammaError(null);
    try {
      const res = await fetch(`/api/relatorios/${reportId}/resultados/${resultado.id}/gamma`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) { setGammaError(json.error ?? "Erro ao exportar para Gamma."); return; }
      setGammaUrl(json.gammaUrl);
    } catch {
      setGammaError("Não foi possível conectar ao servidor.");
    } finally {
      setGammaLoading(false);
    }
  }

  function formatPeriod() {
    if (resultado.params.periodoInicio && resultado.params.periodoFim) {
      const ini = new Date(resultado.params.periodoInicio).toLocaleDateString("pt-BR");
      const fim = new Date(resultado.params.periodoFim).toLocaleDateString("pt-BR");
      return `${ini} – ${fim}`;
    }
    return resultado.params.arquivoNome ?? "Análise";
  }

  function handlePrint() {
    const period = formatPeriod();
    const geradoEm = new Date(resultado.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const totalInfo = resultado.totalRows != null ? ` · ${resultado.totalRows} respostas` : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.65; color: #1a1a1a; max-width: 820px; margin: 0 auto; padding: 20mm 18mm; }
    .meta { font-family: Arial, sans-serif; font-size: 9pt; color: #666; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 24px; }
    h1 { font-size: 20pt; line-height: 1.2; margin-bottom: 6px; }
    h2 { font-family: Arial, sans-serif; font-size: 13pt; font-weight: bold; margin-top: 28px; margin-bottom: 8px; color: #111; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; page-break-after: avoid; }
    h3 { font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; margin-top: 18px; margin-bottom: 6px; color: #333; page-break-after: avoid; }
    p { margin-bottom: 8px; }
    ul, ol { padding-left: 22px; margin-bottom: 10px; }
    li { margin-bottom: 4px; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: bold; font-family: Arial, sans-serif; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #555; margin: 12px 0; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
    @page { margin: 20mm 15mm; }
  </style>
</head>
<body>
  <div class="meta"><strong>${period}</strong>${totalInfo} &nbsp;·&nbsp; Gerado em ${geradoEm}</div>
  ${html}
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleCopyLink}>
            <Link2 size={13} className="mr-1.5" />
            {copied ? "Copiado!" : "Copiar link"}
          </Button>
          {resultado.resultadoApresentacao && (
            gammaUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={gammaUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} className="mr-1.5" />
                  Abrir no Gamma
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleExportGamma} disabled={gammaLoading}>
                {gammaLoading
                  ? <><Loader2 size={13} className="animate-spin mr-1.5" />Gerando apresentação...</>
                  : <><Presentation size={13} className="mr-1.5" />Exportar para Gamma</>
                }
              </Button>
            )
          )}
          {(outputFormat === "pdf" || true) && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={13} className="mr-1.5" />
              Exportar PDF
            </Button>
          )}
        </div>
        {gammaError && <p className="text-xs text-destructive">{gammaError}</p>}
      </div>

      <div className="border rounded-lg p-6 bg-card">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

