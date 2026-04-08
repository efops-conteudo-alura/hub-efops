"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart2 } from "lucide-react";
import { MonthPicker } from "./month-picker";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const ALL_CATEGORIES = [
  { value: "INSTRUTOR", label: "Instrutor", color: "#6366f1" },
  { value: "EDITOR_FREELANCER", label: "Editor Freelancer", color: "#f59e0b" },
  { value: "EDITOR_EXTERNO", label: "Editor Externo", color: "#10b981" },
  { value: "SUPORTE_EDUCACIONAL", label: "Suporte Educacional", color: "#f43f5e" },
  { value: "OUTROS", label: "Outros", color: "#64748b" },
];

interface Expense {
  month: string;
  value: number;
  category: string;
}

interface ChartRow {
  month: string;
  media3?: number | null;
  [category: string]: number | string | null | undefined;
}

function groupByMonthAndCategory(expenses: Expense[], selectedCategories: string[]): ChartRow[] {
  const map: Record<string, Record<string, number>> = {};
  for (const e of expenses) {
    if (!selectedCategories.includes(e.category)) continue;
    if (!map[e.month]) map[e.month] = {};
    map[e.month][e.category] = (map[e.month][e.category] ?? 0) + e.value;
  }
  const rows = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cats]) => ({ month, ...cats }));

  // Média móvel de 3 meses sobre o total de cada mês
  return rows.map((row, i) => {
    const slice = rows.slice(Math.max(0, i - 2), i + 1);
    const avg = slice.reduce((s, r) => {
      const rowTotal = selectedCategories.reduce((rs, cat) => rs + (((r as ChartRow)[cat] as number) || 0), 0);
      return s + rowTotal;
    }, 0) / slice.length;
    return { ...row, media3: Math.round(avg * 100) / 100 };
  });
}

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return `${month}/${year.slice(2)}`;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function ExpensesByCategoryTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { dataKey: string; value: number; color: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const barItems = payload.filter((e) => e.dataKey !== "media3" && e.value > 0);
  const mediaItem = payload.find((e) => e.dataKey === "media3");
  if (!barItems.length && !mediaItem) return null;
  return (
    <div className="rounded-md border bg-popover shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{formatMonth(String(label))}</p>
      {barItems.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {ALL_CATEGORIES.find((c) => c.value === entry.dataKey)?.label ?? entry.dataKey}:{" "}
          <span className="font-medium">{formatBRL(entry.value)}</span>
        </p>
      ))}
      {mediaItem && (
        <p style={{ color: mediaItem.color }} className="border-t border-border pt-0.5 mt-0.5">
          Média 3 meses: <span className="font-medium">{formatBRL(mediaItem.value)}</span>
        </p>
      )}
    </div>
  );
}

export function ExpensesByCategory() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [selected, setSelected] = useState<string[]>(ALL_CATEGORIES.map((c) => c.value));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (monthFrom) params.set("month_from", monthFrom);
    if (monthTo) params.set("month_to", monthTo);
    const res = await fetch(`/api/gastos?${params}`);
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  }, [monthFrom, monthTo]);

  useEffect(() => { load(); }, [load]);

  function toggleCategory(cat: string) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const chartData = groupByMonthAndCategory(expenses, selected);

  // Tabela resumo: por mês, colunas por categoria selecionada
  const months = [...new Set(expenses.map((e) => e.month))].sort();
  const tableData = months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const cat of selected) {
      row[cat] = expenses
        .filter((e) => e.month === month && e.category === cat)
        .reduce((s, e) => s + e.value, 0);
    }
    return row;
  });

  const selectedCategories = ALL_CATEGORIES.filter((c) => selected.includes(c.value));

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <MonthPicker value={monthFrom} onChange={setMonthFrom} placeholder="Início" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <MonthPicker value={monthTo} onChange={setMonthTo} placeholder="Fim" />
        </div>
        {(monthFrom || monthTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonthFrom(""); setMonthTo(""); }}>
            Limpar tudo
          </Button>
        )}
      </div>

      {/* Seletor de categorias */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => {
          const isSelected = selected.includes(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => toggleCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isSelected
                  ? "text-white border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground"
              }`}
              style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Gráfico */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum dado para exibir.</p>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="hub-card-title flex items-center gap-2">
              <BarChart2 size={15} className="text-muted-foreground" />
              Gastos por categoria ao longo do tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={56} />
                <Tooltip content={ExpensesByCategoryTooltip} />
                <Legend
                  formatter={(v) => v === "media3" ? "Média 3 meses" : (ALL_CATEGORIES.find((c) => c.value === v)?.label ?? v)}
                  wrapperStyle={{ fontSize: 12, background: "hsl(var(--card) / 0.85)", borderRadius: 6, padding: "2px 8px", border: "1px solid hsl(var(--border))" }}
                />
                {selectedCategories.map((cat) => (
                  <Bar
                    key={cat.value}
                    dataKey={cat.value}
                    stackId="stack"
                    fill={cat.color}
                    maxBarSize={40}
                  />
                ))}
                <Line type="monotone" dataKey="media3" stroke="#ffffff" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela resumo */}
      {tableData.length > 0 && (
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="hub-table-header text-left pb-2 pr-4">Mês</th>
                  {selectedCategories.map((cat) => (
                    <th key={cat.value} className="hub-table-header text-right pb-2 px-3">
                      {cat.label}
                    </th>
                  ))}
                  <th className="hub-table-header text-right pb-2 pl-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableData.map((row) => {
                  const rowTotal = selectedCategories.reduce(
                    (s, cat) => s + ((row[cat.value] as number) || 0),
                    0
                  );
                  return (
                    <tr key={row.month as string}>
                      <td className="py-2 hub-number text-muted-foreground pr-4">{row.month as string}</td>
                      {selectedCategories.map((cat) => (
                        <td key={cat.value} className="py-2 text-right px-3">
                          {(row[cat.value] as number) > 0 ? formatBRL(row[cat.value] as number) : "—"}
                        </td>
                      ))}
                      <td className="py-2 text-right hub-number pl-3">{formatBRL(rowTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="py-2 pr-4">Total</td>
                  {selectedCategories.map((cat) => {
                    const catTotal = tableData.reduce(
                      (s, row) => s + ((row[cat.value] as number) || 0),
                      0
                    );
                    return (
                      <td key={cat.value} className="py-2 text-right hub-number px-3">
                        {catTotal > 0 ? formatBRL(catTotal) : "—"}
                      </td>
                    );
                  })}
                  <td className="py-2 text-right hub-number pl-3">
                    {formatBRL(
                      tableData.reduce(
                        (s, row) =>
                          s + selectedCategories.reduce((rs, cat) => rs + ((row[cat.value] as number) || 0), 0),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
