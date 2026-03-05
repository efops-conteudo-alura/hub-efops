"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ProducaoFormDialog, type KpiProducao } from "./producao-form-dialog";

interface Pesos {
  curso: number;
  artigo: number;
  carreira: number;
  nivel: number;
  trilha: number;
}

interface ProducaoTableProps {
  year: number;
  data: KpiProducao[];
  pesos: Pesos;
  onChange: (data: KpiProducao[]) => void;
}

export function calcScoreProducao(row: KpiProducao, pesos: Pesos) {
  return row.cursos * pesos.curso + row.artigos * pesos.artigo + row.carreiras * pesos.carreira + row.niveis * pesos.nivel + row.trilhas * pesos.trilha;
}

export function fmtMonthShort(month: string) {
  const [year, m] = month.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[parseInt(m) - 1]}/${year.slice(2)}`;
}

export function fmtMonthLong(month: string) {
  const [year, m] = month.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

export function buildProducaoTsv(data: KpiProducao[], pesos: Pesos): string {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) return "";

  const scores = sorted.map((r) => calcScoreProducao(r, pesos));

  function mm3(idx: number): string {
    if (idx < 2) return "—";
    return String(Math.round((scores[idx - 2] + scores[idx - 1] + scores[idx]) / 3));
  }

  const header = ["Publicação de Conteúdo", ...sorted.map((r) => fmtMonthLong(r.month))].join("\t");
  const rows = [
    ["# Cursos", ...sorted.map((r) => String(r.cursos))].join("\t"),
    ["# Artigos", ...sorted.map((r) => String(r.artigos))].join("\t"),
    ["# Carreiras", ...sorted.map((r) => String(r.carreiras))].join("\t"),
    ["# Níveis", ...sorted.map((r) => String(r.niveis))].join("\t"),
    ["# Trilhas", ...sorted.map((r) => String(r.trilhas))].join("\t"),
    ["Score do mês", ...scores.map(String)].join("\t"),
    ["MM 3 meses", ...sorted.map((_, i) => mm3(i))].join("\t"),
  ];

  return [header, ...rows].join("\n");
}

// Gera os 12 meses do ano no formato YYYY-MM
function allMonthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function ProducaoTable({ year, data, pesos, onChange }: ProducaoTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMonth, setDialogMonth] = useState("");
  const [editing, setEditing] = useState<KpiProducao | null>(null);

  const allMonths = allMonthsOfYear(year);
  const dataByMonth = new Map(data.map((r) => [r.month, r]));

  // Para cálculo de MM3 precisamos dos meses com dados em ordem
  const sortedWithData = allMonths
    .map((m) => dataByMonth.get(m))
    .filter((r): r is KpiProducao => r !== undefined);
  const scoresByMonth = new Map(
    sortedWithData.map((r) => [r.month, calcScoreProducao(r, pesos)])
  );

  function mm3(month: string): string {
    const idx = sortedWithData.findIndex((r) => r.month === month);
    if (idx < 2) return "—";
    const s = sortedWithData.slice(idx - 2, idx + 1).map((r) => scoresByMonth.get(r.month)!);
    return String(Math.round((s[0] + s[1] + s[2]) / 3));
  }

  function openAdd(month: string) {
    setEditing(null);
    setDialogMonth(month);
    setDialogOpen(true);
  }

  function openEdit(row: KpiProducao) {
    setEditing(row);
    setDialogMonth(row.month);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/producao/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiProducao) {
    if (editing) onChange(data.map((r) => (r.id === record.id ? record : r)));
    else onChange([record, ...data]);
  }

  const metrics: { label: string; getValue: (r: KpiProducao) => number }[] = [
    { label: "# Cursos", getValue: (r) => r.cursos },
    { label: "# Artigos", getValue: (r) => r.artigos },
    { label: "# Carreiras", getValue: (r) => r.carreiras },
    { label: "# Níveis", getValue: (r) => r.niveis },
    { label: "# Trilhas", getValue: (r) => r.trilhas },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Publicação de Conteúdo</p>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium w-36 whitespace-nowrap" />
              {allMonths.map((m) => (
                <th key={m} className="px-3 py-2 text-center text-xs font-semibold whitespace-nowrap">
                  {fmtMonthShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ label, getValue }) => (
              <tr key={label} className="border-b hover:bg-muted/20">
                <td className="px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap">{label}</td>
                {allMonths.map((m) => {
                  const r = dataByMonth.get(m);
                  return (
                    <td key={m} className="px-3 py-2 text-sm text-center tabular-nums text-muted-foreground">
                      {r ? <span className="text-foreground">{getValue(r)}</span> : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-b bg-muted/20">
              <td className="px-3 py-2 text-sm font-semibold whitespace-nowrap">Score do mês</td>
              {allMonths.map((m) => {
                const score = scoresByMonth.get(m);
                return (
                  <td key={m} className="px-3 py-2 text-sm text-center font-bold tabular-nums">
                    {score !== undefined ? <span className="text-primary">{score}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b">
              <td className="px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap">MM 3 meses</td>
              {allMonths.map((m) => {
                const hasData = dataByMonth.has(m);
                return (
                  <td key={m} className="px-3 py-2 text-sm text-center text-muted-foreground tabular-nums">
                    {hasData ? mm3(m) : "—"}
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

      <ProducaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={dialogMonth}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
