"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Settings2,
} from "lucide-react";
import { TimeFormDialog } from "./time-form-dialog";
import { ColaboradorFormDialog } from "./colaborador-form-dialog";

interface Colaborador {
  id: string;
  timeId: string;
  nome: string;
  clickupUsername: string | null;
  matricula: string | null;
  cargaHorariaDiaria: number;
  ordem: number;
  tipo: "NORMAL" | "LIDER" | "ESPECIAL";
  regraJson: string | null;
  ignorar: boolean;
}

interface Time {
  id: string;
  nome: string;
  clickupListId: string;
  ordem: number;
  colaboradores: Colaborador[];
}

interface Props {
  times: Time[];
}

const TIPO_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  LIDER: "Líder",
  ESPECIAL: "Especial",
};

function getRegraLabel(tipo: string, regraJson: string | null): string {
  if (!regraJson) return "";
  try {
    const r = JSON.parse(regraJson);
    if (tipo === "LIDER") return `Liderados: ${(r.liderados ?? []).join(", ")}`;
    if (r.tipo === "1H_OU_5H") return `${r.horasAusente}h base / ${r.horasPresente}h se presente`;
    if (r.tipo === "FIXO_POR_CURSO") return `${r.horas}h fixo por curso (até máximo)`;
  } catch {
    return "";
  }
  return "";
}

export function TimesConfigClient({ times: initialTimes }: Props) {
  const [times, setTimes] = useState<Time[]>(initialTimes);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [timeDialog, setTimeDialog] = useState<{ open: boolean; time?: Time }>({ open: false });
  const [colabDialog, setColabDialog] = useState<{
    open: boolean;
    timeId: string;
    colaborador?: Colaborador;
  }>({ open: false, timeId: "" });

  const reload = useCallback(async () => {
    const res = await fetch("/api/imobilizacao/times");
    if (res.ok) setTimes(await res.json());
  }, []);

  const toggleExpandido = (id: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const deletarTime = async (id: string) => {
    if (!confirm("Excluir este time e todos os seus colaboradores?")) return;
    await fetch(`/api/imobilizacao/times/${id}`, { method: "DELETE" });
    await reload();
  };

  const deletarColaborador = async (timeId: string, colabId: string) => {
    if (!confirm("Remover este colaborador do time?")) return;
    await fetch(`/api/imobilizacao/times/${timeId}/colaboradores/${colabId}`, { method: "DELETE" });
    await reload();
  };

  const moverColaborador = async (time: Time, idx: number, direcao: "up" | "down") => {
    const cols = [...time.colaboradores];
    const outro = direcao === "up" ? idx - 1 : idx + 1;
    if (outro < 0 || outro >= cols.length) return;

    const ordemAtual = cols[idx].ordem;
    const ordemOutro = cols[outro].ordem;

    await fetch(`/api/imobilizacao/times/${time.id}/colaboradores/reordenar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        { id: cols[idx].id, ordem: ordemOutro },
        { id: cols[outro].id, ordem: ordemAtual },
      ]),
    });
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setTimeDialog({ open: true })}>
          <Plus size={14} className="mr-2" />
          Novo Time
        </Button>
      </div>

      {times.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center border rounded-lg bg-muted/10">
          <Settings2 size={36} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum time configurado. Crie o primeiro time para começar.
          </p>
        </div>
      )}

      {times.map((time) => {
        const aberto = expandidos.has(time.id);
        return (
          <div key={time.id} className="border rounded-lg overflow-hidden">
            {/* Header do time */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
              <button
                onClick={() => toggleExpandido(time.id)}
                className="flex items-center gap-2 text-left flex-1"
              >
                {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="font-semibold">{time.nome}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({time.colaboradores.length} colaboradores · List: {time.clickupListId})
                </span>
              </button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTimeDialog({ open: true, time })}
                >
                  <Pencil size={13} className="mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deletarTime(time.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>

            {/* Colaboradores */}
            {aberto && (
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setColabDialog({ open: true, timeId: time.id })}
                  >
                    <Plus size={13} className="mr-1" />
                    Adicionar Colaborador
                  </Button>
                </div>

                {time.colaboradores.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum colaborador neste time.
                  </p>
                )}

                <div className="space-y-1">
                  {time.colaboradores.map((col, idx) => (
                    <div
                      key={col.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm border ${
                        col.ignorar ? "opacity-50 bg-muted/20" : "bg-background"
                      }`}
                    >
                      {/* Reordenar */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moverColaborador(time, idx, "up")}
                          disabled={idx === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => moverColaborador(time, idx, "down")}
                          disabled={idx === time.colaboradores.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{col.nome}</span>
                          {col.clickupUsername && col.clickupUsername !== col.nome && (
                            <span className="text-xs text-muted-foreground">
                              ({col.clickupUsername})
                            </span>
                          )}
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              col.tipo === "LIDER"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : col.tipo === "ESPECIAL"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {TIPO_LABELS[col.tipo]}
                          </span>
                          {col.ignorar && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                              Ignorado
                            </span>
                          )}
                        </div>
                        {col.regraJson && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getRegraLabel(col.tipo, col.regraJson)}
                          </p>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setColabDialog({ open: true, timeId: time.id, colaborador: col })
                          }
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deletarColaborador(time.id, col.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <TimeFormDialog
        open={timeDialog.open}
        time={timeDialog.time}
        onOpenChange={(open) => setTimeDialog((prev) => ({ ...prev, open }))}
        onSuccess={async () => {
          await reload();
          setTimeDialog({ open: false });
        }}
      />

      <ColaboradorFormDialog
        open={colabDialog.open}
        timeId={colabDialog.timeId}
        colaborador={colabDialog.colaborador}
        onOpenChange={(open) => setColabDialog((prev) => ({ ...prev, open }))}
        onSuccess={async () => {
          await reload();
          setColabDialog({ open: false, timeId: "" });
        }}
      />
    </div>
  );
}
