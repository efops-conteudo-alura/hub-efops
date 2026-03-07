"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { SyncClickUpButton } from "./sync-button";
import { UploadDialog } from "./upload-dialog";
import { MonthPicker } from "./month-picker";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CATEGORY_LABELS: Record<string, string> = {
  INSTRUTOR: "Instrutor",
  EDITOR_FREELANCER: "Editor Freelancer",
  EDITOR_EXTERNO: "Editor Externo",
  SUPORTE_EDUCACIONAL: "Suporte Educacional",
  OUTROS: "Outros",
};

interface Expense {
  id: string;
  month: string;
  date?: string | null;
  value: number;
  category: string;
  description?: string | null;
  notes?: string | null;
  source: string;
}

interface MonthTotal {
  month: string;
  total: number;
  media3: number | null;
}

function computeMovingAverage(data: MonthTotal[], window = 3): MonthTotal[] {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, x) => s + x.total, 0) / slice.length;
    return { ...d, media3: Math.round(avg * 100) / 100 };
  });
}

function groupByMonth(expenses: Expense[]): MonthTotal[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.month] = (map[e.month] ?? 0) + e.value;
  }
  const sorted = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total, media3: null as number | null }));
  return computeMovingAverage(sorted);
}

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return `${month}/${year.slice(2)}`;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

interface Props {
  isAdmin: boolean;
}

function ExpensesOverviewTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { dataKey: string; value: number; color: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{formatMonth(String(label))}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.dataKey === "total" ? "Total" : "Média 3 meses"}:{" "}
          <span className="font-medium">{formatBRL(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function ExpensesOverview({ isAdmin }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [sortField, setSortField] = useState<"date" | "category" | "description" | "value">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "value" ? "desc" : "asc");
    }
  }

  function sortedExpenses(): Expense[] {
    return [...expenses].sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        const da = a.date ?? a.month;
        const db = b.date ?? b.month;
        cmp = da.localeCompare(db);
      } else if (sortField === "category") {
        cmp = (CATEGORY_LABELS[a.category] ?? a.category).localeCompare(CATEGORY_LABELS[b.category] ?? b.category);
      } else if (sortField === "description") {
        cmp = (a.description ?? "").localeCompare(b.description ?? "");
      } else if (sortField === "value") {
        cmp = a.value - b.value;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

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

  async function handleDelete(id: string) {
    if (!confirm("Remover esta entrada?")) return;
    await fetch(`/api/gastos/${id}`, { method: "DELETE" });
    load();
  }

  const chartData = groupByMonth(expenses);
  const totalGeral = expenses.reduce((s, e) => s + e.value, 0);

  return (
    <div className="space-y-6">
      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        {isAdmin && (
          <>
            <SyncClickUpButton onSynced={load} />
            <UploadDialog onUploaded={load} />
          </>
        )}
        <ExpenseFormDialog onSaved={load} />
      </div>

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

      {/* Gráfico */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" />
              Total por mês + Média móvel (3 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={56} />
                <Tooltip content={ExpensesOverviewTooltip} />
                <Legend formatter={(v) => v === "total" ? "Total" : "Média 3 meses"} wrapperStyle={{ fontSize: 12, background: "hsl(var(--card) / 0.85)", borderRadius: 6, padding: "2px 8px", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="media3" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resumo total */}
      {expenses.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {expenses.length} entradas · Total: <span className="font-semibold text-foreground">{formatBRL(totalGeral)}</span>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center italic">Nenhuma entrada encontrada.</p>
          ) : (
            <div>
              {/* Cabeçalho ordenável */}
              <div className="flex items-center gap-4 pb-2 border-b mb-1">
                {(
                  [
                    { field: "date", label: "Data" },
                    { field: "category", label: "Categoria" },
                    { field: "description", label: "Nome" },
                  ] as const
                ).map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                    {sortField === field ? (
                      sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => handleSort("value")}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  Valor
                  {sortField === "value" ? (
                    sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  ) : (
                    <ArrowUpDown size={12} className="opacity-40" />
                  )}
                </button>
              </div>
              <div className="divide-y">
                {sortedExpenses().map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-sm font-mono text-muted-foreground shrink-0" title={e.date ?? undefined}>
                        {e.date
                          ? new Date(e.date + "T00:00:00").toLocaleDateString("pt-BR")
                          : e.month}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </Badge>
                      {e.description && (
                        <span className="text-sm text-muted-foreground truncate">{e.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatBRL(e.value)}</span>
                      <ExpenseFormDialog expense={e} onSaved={load} />
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
