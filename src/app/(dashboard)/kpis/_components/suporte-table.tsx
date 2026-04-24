"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fmtMonthShort } from "./producao-table";
import { SuporteFormDialog, type KpiSuporte } from "./suporte-form-dialog";

interface SuporteTableProps {
  year: number;
  data: KpiSuporte[];
  isAdmin: boolean;
  onChange: (data: KpiSuporte[]) => void;
}

export function buildSuporteTsv(data: KpiSuporte[]): string {
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length === 0) return "";

  const months = sorted.map((r) => fmtMonthShort(r.month));

  const rows = [
    "Suporte Educacional",                                                                    // título da seção
    ["Entregas", ...months].join("\t"),                                                       // sub-cabeçalho + meses
    ["Tópicos respondidos", ...sorted.map((r) => String(r.topicosRespondidos))].join("\t"),
    ["SLA médio (h)", ...sorted.map((r) => fmtSla(r.slaMedio))].join("\t"),
    ["Artigos criados", ...sorted.map((r) => String(r.artigosCriados))].join("\t"),
    ["Artigos revisados", ...sorted.map((r) => String(r.artigosRevisados))].join("\t"),
    ["Imersões", ...sorted.map((r) => String(r.imersoes))].join("\t"),
  ];

  return rows.join("\n");
}

function allMonthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

function fmtSla(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function avgSla(values: number[]): string {
  if (values.length === 0) return "—";
  return fmtSla(values.reduce((s, v) => s + v, 0) / values.length);
}

export function SuporteTable({ year, data, isAdmin, onChange }: SuporteTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMonth, setDialogMonth] = useState("");
  const [editing, setEditing] = useState<KpiSuporte | null>(null);

  const allMonths = allMonthsOfYear(year);
  const dataByMonth = new Map(data.map((r) => [r.month, r]));
  const dataWithValues = allMonths.map((m) => dataByMonth.get(m)).filter((r): r is KpiSuporte => r !== undefined);
  const hasData = dataWithValues.length > 0;

  function openAdd(month: string) {
    setEditing(null);
    setDialogMonth(month);
    setDialogOpen(true);
  }

  function openEdit(row: KpiSuporte) {
    setEditing(row);
    setDialogMonth(row.month);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/suporte/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiSuporte) {
    if (editing) onChange(data.map((r) => (r.id === record.id ? record : r)));
    else onChange([record, ...data]);
  }

  const colHeader = "px-3 py-2 hub-table-header text-center whitespace-nowrap";
  const rowLabel = "px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap w-40";
  const cell = "px-3 py-2 text-sm text-center tabular-nums";
  const thTotal = "px-3 py-2 hub-table-header text-center whitespace-nowrap border-l";
  const tdTotal = "px-3 py-2 text-sm text-center tabular-nums border-l";

  const totalTopicos = dataWithValues.reduce((s, r) => s + r.topicosRespondidos, 0);
  const totalArtigosCriados = dataWithValues.reduce((s, r) => s + r.artigosCriados, 0);
  const totalArtigosRevisados = dataWithValues.reduce((s, r) => s + r.artigosRevisados, 0);
  const totalImersoes = dataWithValues.reduce((s, r) => s + r.imersoes, 0);

  const metrics: {
    label: string;
    getValue: (r: KpiSuporte) => string;
    total: string;
  }[] = [
    {
      label: "Tópicos respondidos",
      getValue: (r) => String(r.topicosRespondidos),
      total: hasData ? String(totalTopicos) : "—",
    },
    {
      label: "SLA médio",
      getValue: (r) => fmtSla(r.slaMedio),
      total: hasData ? avgSla(dataWithValues.map((r) => r.slaMedio)) : "—",
    },
    {
      label: "Artigos criados",
      getValue: (r) => String(r.artigosCriados),
      total: hasData ? String(totalArtigosCriados) : "—",
    },
    {
      label: "Artigos revisados",
      getValue: (r) => String(r.artigosRevisados),
      total: hasData ? String(totalArtigosRevisados) : "—",
    },
    {
      label: "Imersões",
      getValue: (r) => String(r.imersoes),
      total: hasData ? String(totalImersoes) : "—",
    },
  ];

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 hub-table-header text-left w-40" />
            {allMonths.map((m) => (
              <th key={m} className={colHeader}>{fmtMonthShort(m)}</th>
            ))}
            <th className={thTotal + " text-muted-foreground"}>Total no Ano</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map(({ label, getValue, total }) => (
            <tr key={label} className="border-b hover:bg-muted/20">
              <td className={rowLabel}>{label}</td>
              {allMonths.map((m) => {
                const r = dataByMonth.get(m);
                return (
                  <td key={m} className={cell + " text-muted-foreground"}>
                    {r ? <span className="text-foreground">{getValue(r)}</span> : "—"}
                  </td>
                );
              })}
              <td className={tdTotal + " font-semibold"}>
                {total === "—" ? <span className="text-muted-foreground">—</span> : total}
              </td>
            </tr>
          ))}
          {isAdmin && (
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
              <td className="px-3 py-1 border-l" />
            </tr>
          )}
        </tbody>
      </table>

      <SuporteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={dialogMonth}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
