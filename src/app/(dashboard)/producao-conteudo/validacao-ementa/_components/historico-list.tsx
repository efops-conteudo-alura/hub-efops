"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2, History, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface AnaliseResumo {
  id: string;
  titulo: string;
  autorNome: string;
  createdAt: string;
}

interface AnaliseFull extends AnaliseResumo {
  ementaOriginal: string;
  avaliacao: string;
  sugestaoEmenta: string;
}

interface Props {
  analyses: AnaliseResumo[];
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

export function HistoricoList({ analyses }: Props) {
  const [lista, setLista] = useState<AnaliseResumo[]>(analyses);
  const [selecionada, setSelecionada] = useState<AnaliseFull | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  async function abrirAnalise(id: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/producao-conteudo/ementas/${id}`);
      const data = await res.json();
      setSelecionada(data);
    } finally {
      setLoadingId(null);
    }
  }

  async function deletarAnalise(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta análise?")) return;
    setDeletandoId(id);
    try {
      await fetch(`/api/producao-conteudo/ementas/${id}`, { method: "DELETE" });
      setLista((prev) => prev.filter((a) => a.id !== id));
      if (selecionada?.id === id) setSelecionada(null);
    } finally {
      setDeletandoId(null);
    }
  }

  if (lista.length === 0) return null;

  return (
    <>
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <History size={16} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Análises salvas ({lista.length})
          </h2>
        </div>

        <div className="space-y-2 max-w-3xl">
          {lista.map((a) => (
            <div
              key={a.id}
              onClick={() => abrirAnalise(a.id)}
              className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.autorNome} · {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                {loadingId === a.id ? (
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <button
                  onClick={(e) => deletarAnalise(a.id, e)}
                  disabled={deletandoId === a.id}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir análise"
                >
                  {deletandoId === a.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={!!selecionada} onOpenChange={(open) => !open && setSelecionada(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-[92vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selecionada?.titulo}</DialogTitle>
            {selecionada && (
              <p className="text-xs text-muted-foreground">
                {selecionada.autorNome} · {new Date(selecionada.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </DialogHeader>

          {selecionada && (() => {
            const { resumo, avaliacaoSemResumo } = extrairResumo(selecionada.avaliacao);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-2 items-start">
                <div className="space-y-4">
                  {resumo && (
                    <Card>
                      <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-sm">Resumo para o instrutor</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <MarkdownRenderer content={resumo} />
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader className="pb-2 border-b">
                      <CardTitle className="text-sm">Avaliação detalhada</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <MarkdownRenderer content={avaliacaoSemResumo || selecionada.avaliacao} />
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-sm">Sugestão de Ementa</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <MarkdownRenderer content={selecionada.sugestaoEmenta} />
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
