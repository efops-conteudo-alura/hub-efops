"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check, ClipboardCheck, Save } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface Resultado {
  avaliacao: string;
  sugestaoEmenta: string;
}

function extrairResumo(avaliacao: string): { resumo: string; avaliacaoSemResumo: string } {
  const marcador = "## Resumo para o instrutor";
  const idx = avaliacao.indexOf(marcador);
  if (idx === -1) return { resumo: "", avaliacaoSemResumo: avaliacao };
  return {
    resumo: avaliacao.slice(idx + marcador.length).trim(),
    avaliacaoSemResumo: avaliacao.slice(0, idx).trim(),
  };
}

export function ValidadorForm() {
  const router = useRouter();
  const [nomeCurso, setNomeCurso] = useState("");
  const [ementa, setEmenta] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvou, setSalvou] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ementa.trim()) return;

    setLoading(true);
    setErro(null);
    setResultado(null);
    setSalvou(false);

    try {
      const res = await fetch("/api/producao-conteudo/validar-ementa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ementa, nomeCurso }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar a ementa");
      }

      const data = await res.json();
      setResultado(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function copiarSugestao() {
    if (!resultado?.sugestaoEmenta) return;
    await navigator.clipboard.writeText(resultado.sugestaoEmenta);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function salvarAnalise() {
    if (!resultado || !nomeCurso.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/producao-conteudo/ementas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nomeCurso,
          ementaOriginal: ementa,
          avaliacao: resultado.avaliacao,
          sugestaoEmenta: resultado.sugestaoEmenta,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSalvou(true);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar a análise. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulário de entrada */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="space-y-1.5">
          <Label htmlFor="nomeCurso">Nome / Assunto do curso</Label>
          <Input
            id="nomeCurso"
            placeholder="Ex: N8N para Marketing — Automação de Pipeline de Dados"
            value={nomeCurso}
            onChange={(e) => setNomeCurso(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ementa">Ementa do instrutor</Label>
          <Textarea
            id="ementa"
            placeholder="Cole aqui a ementa recebida do instrutor — pode incluir objetivo, ferramentas, projeto, módulos e lista de vídeos..."
            rows={16}
            value={ementa}
            onChange={(e) => setEmenta(e.target.value)}
            className="font-mono text-sm resize-y"
            disabled={loading}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || !ementa.trim()}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Analisando... isso pode levar até 30 segundos
              </>
            ) : (
              <>
                <ClipboardCheck size={16} className="mr-2" />
                Validar Ementa
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Erro */}
      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Análise concluída.</p>
            <div className="flex items-center gap-2">
              {salvou ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check size={14} />
                  Análise salva
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={salvarAnalise}
                  disabled={salvando || !nomeCurso.trim()}
                  title={!nomeCurso.trim() ? "Preencha o nome do curso para salvar" : ""}
                >
                  {salvando ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1.5" />
                  )}
                  Salvar análise
                </Button>
              )}
            </div>
          </div>

          {/* Grid de dois painéis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Coluna 1: Resumo + Avaliação */}
            <div className="space-y-4">
              {(() => {
                const { resumo, avaliacaoSemResumo } = extrairResumo(resultado.avaliacao);
                return (
                  <>
                    {resumo && (
                      <Card>
                        <CardHeader className="pb-3 border-b">
                          <CardTitle className="text-base">Resumo</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <MarkdownRenderer content={resumo} />
                        </CardContent>
                      </Card>
                    )}
                    <Card>
                      <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base">Avaliação detalhada</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <MarkdownRenderer content={avaliacaoSemResumo || resultado.avaliacao} />
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>

            {/* Sugestão de Ementa */}
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base">Sugestão de Ementa</CardTitle>
                {resultado.sugestaoEmenta && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copiarSugestao}
                    className="shrink-0 gap-1.5 text-muted-foreground"
                  >
                    {copiado ? (
                      <>
                        <Check size={14} className="text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copiar
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {resultado.sugestaoEmenta ? (
                  <MarkdownRenderer content={resultado.sugestaoEmenta} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sugestão não gerada. Tente novamente.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


