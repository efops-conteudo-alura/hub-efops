"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, History, ChevronRight, Trash2 } from "lucide-react";
import { ResultadoPesquisa } from "./resultado-pesquisa";

interface PesquisaResumo {
  id: string;
  assunto: string;
  tipoConteudo: string;
  tipoPesquisa: string;
  autorNome: string;
  createdAt: string;
  resultado: string;
}

interface Props {
  pesquisas: PesquisaResumo[];
}

export function HistoricoPesquisas({ pesquisas }: Props) {
  const [lista, setLista] = useState<PesquisaResumo[]>(pesquisas);
  const [selecionada, setSelecionada] = useState<PesquisaResumo | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);

  async function deletarPesquisa(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta pesquisa?")) return;
    setDeletandoId(id);
    try {
      await fetch(`/api/pesquisa-mercado/${id}`, { method: "DELETE" });
      setLista((prev) => prev.filter((p) => p.id !== id));
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
            Pesquisas salvas ({lista.length})
          </h2>
        </div>

        <div className="space-y-2 max-w-3xl">
          {lista.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelecionada(p)}
              className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.assunto}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.tipoConteudo} · {p.tipoPesquisa} · {p.autorNome} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={(e) => deletarPesquisa(p.id, e)}
                  disabled={deletandoId === p.id}
                  className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  title="Excluir pesquisa"
                >
                  {deletandoId === p.id ? (
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

      <Dialog open={!!selecionada} onOpenChange={(open) => !open && setSelecionada(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-[92vw] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selecionada?.assunto}</DialogTitle>
            {selecionada && (
              <p className="text-xs text-muted-foreground">
                {selecionada.tipoConteudo} · {selecionada.tipoPesquisa} · {selecionada.autorNome} ·{" "}
                {new Date(selecionada.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </DialogHeader>

          {selecionada && (
            <div className="mt-2">
              <ResultadoPesquisa resultado={selecionada.resultado} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
