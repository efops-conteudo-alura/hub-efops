"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Settings2,
  ArrowLeft,
  GripVertical,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TimeFormDialog } from "./time-form-dialog";
import { ColaboradorFormDialog } from "./colaborador-form-dialog";
import { FeriadoFormDialog } from "./feriado-form-dialog";

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
}

interface Time {
  id: string;
  nome: string;
  clickupListId: string;
  clickupListIdsAdicionais: string | null;
  ordem: number;
  colaboradores: Colaborador[];
}

interface FeriadoAlura {
  id: string;
  ano: number;
  data: string;
  descricao: string;
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

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function SortableColaborador({
  col,
  idx,
  totalCols,
  timeId,
  onEdit,
  onDelete,
}: {
  col: Colaborador;
  idx: number;
  totalCols: number;
  timeId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm border bg-background"
    >
      {/* Handle de drag */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        title="Arrastar para reordenar"
      >
        <GripVertical size={14} />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{col.nome}</span>
          {col.clickupUsername && col.clickupUsername !== col.nome && (
            <span className="text-xs text-muted-foreground">({col.clickupUsername})</span>
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
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function FeriadosSection() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [feriados, setFeriados] = useState<FeriadoAlura[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const carregarFeriados = useCallback(async (a: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/imobilizacao/feriados?ano=${a}`);
      if (res.ok) setFeriados(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExpandir = () => {
    if (!expandido && feriados === null) carregarFeriados(ano);
    setExpandido((v) => !v);
  };

  const handleAnoChange = (novoAno: number) => {
    setAno(novoAno);
    carregarFeriados(novoAno);
  };

  const deletarFeriado = async (id: string) => {
    if (!confirm("Remover este feriado?")) return;
    await fetch(`/api/imobilizacao/feriados/${id}`, { method: "DELETE" });
    carregarFeriados(ano);
  };

  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - 1 + i);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <button
          onClick={handleExpandir}
          className="flex items-center gap-2 text-left flex-1"
        >
          {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <CalendarDays size={16} className="text-muted-foreground" />
          <span className="font-semibold">Feriados da Alura</span>
          <span className="text-xs text-muted-foreground ml-1">
            (pontes, emendas e feriados estaduais)
          </span>
        </button>
      </div>

      {expandido && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Ano:</span>
              <select
                value={ano}
                onChange={(e) => handleAnoChange(Number(e.target.value))}
                className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {anos.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus size={13} className="mr-1" />
              Adicionar Feriado
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : feriados && feriados.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum feriado cadastrado para {ano}.
            </p>
          ) : feriados ? (
            <div className="space-y-1">
              {feriados.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between px-3 py-2 rounded-md text-sm border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <span className="hub-number text-muted-foreground">{fmtData(f.data)}</span>
                    <span>{f.descricao}</span>
                  </div>
                  <button
                    onClick={() => deletarFeriado(f.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <FeriadoFormDialog
        open={dialogOpen}
        ano={ano}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          carregarFeriados(ano);
        }}
      />
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reload = useCallback(async () => {
    const res = await fetch("/api/imobilizacao/times");
    if (res.ok) setTimes(await res.json());
  }, []);

  const toggleExpandido = (id: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

  const onDragEnd = async (timeId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const time = times.find((t) => t.id === timeId);
    if (!time) return;

    const oldIdx = time.colaboradores.findIndex((c) => c.id === active.id);
    const newIdx = time.colaboradores.findIndex((c) => c.id === over.id);
    const reordenados = arrayMove(time.colaboradores, oldIdx, newIdx);

    // Atualiza UI otimisticamente
    setTimes((prev) =>
      prev.map((t) => (t.id === timeId ? { ...t, colaboradores: reordenados } : t))
    );

    await fetch(`/api/imobilizacao/times/${timeId}/colaboradores/reordenar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reordenados.map((c, i) => ({ id: c.id, ordem: i }))),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/imobilizacao">
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} className="mr-2" />
            Voltar
          </Button>
        </Link>
        <Button onClick={() => setTimeDialog({ open: true })}>
          <Plus size={14} className="mr-2" />
          Novo Time
        </Button>
      </div>

      {/* Seção de Feriados */}
      <FeriadosSection />

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
                  ({time.colaboradores.length} colaboradores · List: {time.clickupListId}
                  {time.clickupListIdsAdicionais && `, ${time.clickupListIdsAdicionais}`})
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

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => onDragEnd(time.id, e)}
                >
                  <SortableContext
                    items={time.colaboradores.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {time.colaboradores.map((col, idx) => (
                        <SortableColaborador
                          key={col.id}
                          col={col}
                          idx={idx}
                          totalCols={time.colaboradores.length}
                          timeId={time.id}
                          onEdit={() =>
                            setColabDialog({ open: true, timeId: time.id, colaborador: col })
                          }
                          onDelete={() => deletarColaborador(time.id, col.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
