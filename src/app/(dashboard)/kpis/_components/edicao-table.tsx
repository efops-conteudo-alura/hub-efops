"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { EdicaoFormDialog, type KpiEdicao } from "./edicao-form-dialog";
import { fmtMonthShort, fmtMonthLong } from "./producao-table";

interface EdicaoTableProps {
  year: number;
  data: KpiEdicao[];
  onChange: (data: KpiEdicao[]) => void;
}

export function totalEntregas(row: KpiEdicao) {
  return row.entregasConteudo + row.entregasStart + row.entregasLatam + row.entregasMarketing + row.entregasOutras;
}

export function calcScoreEdicao(row: KpiEdicao): number {
  const total = totalEntregas(row);
  if (total === 0) return 0;
  return Math.round(200 * (1 - row.correcoes / total));
}

function pct(part: number, total: number): string {
  if (total === 0) return "—";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function buildEdicaoTsv(data: KpiEdicao[]): string {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) return "";

  const months = sorted.map((r) => fmtMonthLong(r.month));

  const kpiRows = [
    ["Pós-produção", ...months].join("\t"),
    ["Entregas", ...sorted.map((r) => String(totalEntregas(r)))].join("\t"),
    ["Correções", ...sorted.map((r) => String(r.correcoes))].join("\t"),
    ["Score Edição", ...sorted.map((r) => String(calcScoreEdicao(r)))].join("\t"),
  ];

  const distRows = [
    ["Distribuição de Entregas", ...months].join("\t"),
    ["Entregas Conteúdo", ...sorted.map((r) => pct(r.entregasConteudo, totalEntregas(r)))].join("\t"),
    ["Entregas Start", ...sorted.map((r) => pct(r.entregasStart, totalEntregas(r)))].join("\t"),
    ["Entregas Latam", ...sorted.map((r) => pct(r.entregasLatam, totalEntregas(r)))].join("\t"),
    ["Entregas Marketing", ...sorted.map((r) => pct(r.entregasMarketing, totalEntregas(r)))].join("\t"),
    ["Outras (PM3, B2B, DHO…)", ...sorted.map((r) => pct(r.entregasOutras, totalEntregas(r)))].join("\t"),
  ];

  return [...kpiRows, "", ...distRows].join("\n");
}

function allMonthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function EdicaoTable({ year, data, onChange }: EdicaoTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMonth, setDialogMonth] = useState("");
  const [editing, setEditing] = useState<KpiEdicao | null>(null);

  const allMonths = allMonthsOfYear(year);
  const dataByMonth = new Map(data.map((r) => [r.month, r]));

  function openAdd(month: string) {
    setEditing(null);
    setDialogMonth(month);
    setDialogOpen(true);
  }

  function openEdit(row: KpiEdicao) {
    setEditing(row);
    setDialogMonth(row.month);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/edicao/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiEdicao) {
    if (editing) onChange(data.map((r) => (r.id === record.id ? record : r)));
    else onChange([record, ...data]);
  }

  const colHeader = "px-3 py-2 text-center text-xs font-semibold whitespace-nowrap";
  const rowLabel = "px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap w-36";
  const cell = "px-3 py-2 text-sm text-center tabular-nums";

  return (
    <div className="space-y-4">
      {/* KPIs de Edição */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Pós-produção</p>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium w-36" />
                {allMonths.map((m) => (
                  <th key={m} className={colHeader}>{fmtMonthShort(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/20">
                <td className={rowLabel}>Entregas</td>
                {allMonths.map((m) => {
                  const r = dataByMonth.get(m);
                  return <td key={m} className={cell + " text-muted-foreground"}>{r ? <span className="text-foreground">{totalEntregas(r)}</span> : "—"}</td>;
                })}
              </tr>
              <tr className="border-b hover:bg-muted/20">
                <td className={rowLabel}>Correções</td>
                {allMonths.map((m) => {
                  const r = dataByMonth.get(m);
                  return <td key={m} className={cell + " text-muted-foreground"}>{r ? <span className="text-foreground">{r.correcoes}</span> : "—"}</td>;
                })}
              </tr>
              <tr className="border-b bg-muted/20">
                <td className="px-3 py-2 text-sm font-semibold whitespace-nowrap">Score Edição</td>
                {allMonths.map((m) => {
                  const r = dataByMonth.get(m);
                  return (
                    <td key={m} className={cell}>
                      {r ? <span className="font-bold text-primary">{calcScoreEdicao(r)}</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-3 py-1" />
                {allMonths.map((m) => {
                  const r = dataByMonth.get(m);
                  return (
                    <td key={m} className="px-3 py-1 text-center">
                      {r ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(r)}>
                            <Pencil size={11} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}>
                            <Trash2 size={11} />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => openAdd(m)}>
                          <Plus size={11} />
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribuição de Entregas */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Distribuição de Entregas</p>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium w-48" />
                {allMonths.map((m) => (
                  <th key={m} className={colHeader}>{fmtMonthShort(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Entregas Conteúdo", getValue: (r: KpiEdicao) => pct(r.entregasConteudo, totalEntregas(r)) },
                { label: "Entregas Start", getValue: (r: KpiEdicao) => pct(r.entregasStart, totalEntregas(r)) },
                { label: "Entregas Latam", getValue: (r: KpiEdicao) => pct(r.entregasLatam, totalEntregas(r)) },
                { label: "Entregas Marketing", getValue: (r: KpiEdicao) => pct(r.entregasMarketing, totalEntregas(r)) },
                { label: "Outras (PM3, B2B, DHO…)", getValue: (r: KpiEdicao) => pct(r.entregasOutras, totalEntregas(r)) },
              ].map(({ label, getValue }) => (
                <tr key={label} className="border-b hover:bg-muted/20">
                  <td className={rowLabel + " w-48"}>{label}</td>
                  {allMonths.map((m) => {
                    const r = dataByMonth.get(m);
                    return <td key={m} className={cell + " text-muted-foreground"}>{r ? <span className="text-foreground">{getValue(r)}</span> : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EdicaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={dialogMonth}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
