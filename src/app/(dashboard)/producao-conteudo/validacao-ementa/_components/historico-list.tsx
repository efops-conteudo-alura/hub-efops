"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Trash2, History, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { extrairResumo } from "../_utils";

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

export function HistoricoList({ analyses }: Props) {
  const [lista, setLista] = useState<AnaliseResumo[]>(analyses);
  const [selecionada, setSelecionada] = useState<AnaliseFull | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function abrirAnalise(id: string) {
    setLoadingId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/producao-conteudo/ementas/${id}`);
      if (!res.ok) throw new Error("Erro ao carregar análise");
      const data = await res.json();
      setSelecionada(data);
    } catch {
      setErro("Não foi possível carregar a análise. Tente novamente.");
    } finally {
      setLoadingId(null);
    }
  }

  async function deletarAnalise(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta análise?")) return;
    setDeletandoId(id);
    setErro(null);
    try {
      const res = await fetch(`/api/producao-conteudo/ementas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      setLista((prev) => prev.filter((a) => a.id !== id));
      if (selecionada?.id === id) setSelecionada(null);
    } catch {
      setErro("Não foi possível excluir a análise. Tente novamente.");
    } finally {
      setDeletandoId(null);
    }
  }

  if (lista.length === 0) return null;

  return (
    <>
      {erro && (
        <div className="max-w-3xl rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-4">
          {erro}
        </div>
      )}
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
                        <CardTitle className="text-sm">Resumo</CardTitle>
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
