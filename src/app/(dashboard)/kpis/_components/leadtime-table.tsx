"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { LeadtimeFormDialog, type KpiLeadtime } from "./leadtime-form-dialog";

interface LeadtimeTableProps {
  costCenter: "ALURA" | "LATAM";
  data: KpiLeadtime[];
  isAdmin: boolean;
  onChange: (data: KpiLeadtime[]) => void;
}

function diffDays(d1: string | null, d2: string | null): number | null {
  if (!d1 || !d2) return null;
  const diff = Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
  return diff === 0 ? 1 : diff;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [year, month, day] = d.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function fmtDias(n: number | null): string {
  return n !== null ? String(n) : "—";
}

export function LeadtimeTable({ costCenter, data, isAdmin, onChange }: LeadtimeTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KpiLeadtime | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: KpiLeadtime) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/leadtime/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiLeadtime) {
    if (editing) onChange(data.map((r) => (r.id === record.id ? record : r)));
    else onChange([record, ...data]);
  }

  const th = "px-3 py-2 hub-table-header text-left whitespace-nowrap";
  const thRight = "px-3 py-2 hub-table-header text-center whitespace-nowrap";
  const td = "px-3 py-2 text-sm whitespace-nowrap";
  const tdCenter = "px-3 py-2 text-sm text-center tabular-nums whitespace-nowrap";

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className={th}>Nome do curso</th>
              <th className={thRight}>Início</th>
              <th className={thRight}>Grav. início</th>
              <th className={thRight}>Grav. fim</th>
              <th className={thRight}>Ed. início</th>
              <th className={thRight}>Ed. fim</th>
              <th className={thRight}>Conclusão</th>
              <th className={thRight}>Gravação (d)</th>
              <th className={thRight}>Cycle time (d)</th>
              <th className={thRight}>Lead time ed. (d)</th>
              <th className={th}>Instrutor</th>
              <th className={th}>Responsável</th>
              {isAdmin && <th className={thRight} />}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 13 : 12} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {data.map((row) => {
              const tempoGrav = diffDays(row.inicioGravacao, row.fimGravacao);
              const cycleTime = diffDays(row.dataInicio, row.dataConclusao);
              const leadTimeEd = diffDays(row.inicioEdicao, row.fimEdicao);
              return (
                <tr key={row.id} className="border-b hover:bg-muted/20">
                  <td className={td + " max-w-[240px] truncate"}>{row.nome}</td>
                  <td className={tdCenter}>{fmtDate(row.dataInicio)}</td>
                  <td className={tdCenter + " text-muted-foreground"}>{fmtDate(row.inicioGravacao)}</td>
                  <td className={tdCenter + " text-muted-foreground"}>{fmtDate(row.fimGravacao)}</td>
                  <td className={tdCenter + " text-muted-foreground"}>{fmtDate(row.inicioEdicao)}</td>
                  <td className={tdCenter + " text-muted-foreground"}>{fmtDate(row.fimEdicao)}</td>
                  <td className={tdCenter + " text-muted-foreground"}>{fmtDate(row.dataConclusao)}</td>
                  <td className={tdCenter}>{fmtDias(tempoGrav)}</td>
                  <td className={tdCenter + " font-medium"}>{fmtDias(cycleTime)}</td>
                  <td className={tdCenter + " font-medium"}>{fmtDias(leadTimeEd)}</td>
                  <td className={td + " text-muted-foreground"}>{row.instrutor ?? "—"}</td>
                  <td className={td + " text-muted-foreground"}>{row.responsavel ?? "—"}</td>
                  {isAdmin && (
                    <td className="px-3 py-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(row)}>
                          <Pencil size={11} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus size={13} className="mr-1" /> Adicionar curso
        </Button>
      )}

      <LeadtimeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        costCenter={costCenter}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
