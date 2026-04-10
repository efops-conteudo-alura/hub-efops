"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart2, ChevronDown, Check, TrendingUp } from "lucide-react";
import { MonthPicker } from "./month-picker";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line,
} from "recharts";

const CATEGORY_LABELS: Record<string, string> = {
  INSTRUTOR: "Instrutor",
  EDITOR_FREELANCER: "Editor Freelancer",
  EDITOR_EXTERNO: "Editor Externo",
  SUPORTE_EDUCACIONAL: "Suporte Educacional",
  OUTROS: "Outros",
};

const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#3b82f6", "#64748b", "#14b8a6", "#eab308",
];

interface Expense {
  month: string;
  value: number;
  category: string;
  description?: string | null;
  currency?: string | null;
  exchangeRate?: number | null;
}

interface PrestadorRow {
  name: string;
  displayName: string;
  category: string;
  pureBrl: number;
  usdAsBrl: number;
  totalBrl: number;
  totalUsd: number;
  hasUsd: boolean;
}

interface MonthTotal {
  month: string;
  total: number;
  media3: number | null;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function valueBrl(e: Expense): number {
  if (e.currency === "USD") return e.exchangeRate ? e.value * e.exchangeRate : 0;
  return e.value;
}

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return `${month}/${year.slice(2)}`;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function formatUSD(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function buildPrestadorRows(expenses: Expense[]): PrestadorRow[] {
  const map: Record<string, {
    displayName: string;
    pureBrl: number;
    usdAsBrl: number;
    totalUsd: number;
    hasUsd: boolean;
    categories: Record<string, number>;
  }> = {};

  for (const e of expenses) {
    const raw = e.description?.trim() || "Sem nome";
    const key = normalizeName(raw);
    if (!map[key]) {
      map[key] = { displayName: raw, pureBrl: 0, usdAsBrl: 0, totalUsd: 0, hasUsd: false, categories: {} };
    }
    if (raw.length > map[key].displayName.length) map[key].displayName = raw;

    if (e.currency === "USD") {
      map[key].totalUsd += e.value;
      map[key].usdAsBrl += valueBrl(e);
      map[key].hasUsd = true;
    } else {
      map[key].pureBrl += e.value;
    }
    map[key].categories[e.category] = (map[key].categories[e.category] ?? 0) + valueBrl(e);
  }

  return Object.entries(map)
    .sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName, "pt-BR"))
    .map(([key, data]) => {
      const primaryCategory = Object.entries(data.categories).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "OUTROS";
      return {
        name: key,
        displayName: data.displayName,
        category: primaryCategory,
        pureBrl: data.pureBrl,
        usdAsBrl: data.usdAsBrl,
        totalBrl: data.pureBrl + data.usdAsBrl,
        totalUsd: data.totalUsd,
        hasUsd: data.hasUsd,
      };
    });
}

// Top 20 por total BRL para o gráfico de ranking
function buildRankingData(rows: PrestadorRow[]) {
  return [...rows]
    .sort((a, b) => b.totalBrl - a.totalBrl)
    .slice(0, 20)
    .map((r) => ({ name: r.displayName, total: Math.round(r.totalBrl) }));
}

// Gráfico de gastos ao longo do tempo (total por mês, sem empilhar)
function buildTimeData(expenses: Expense[]): MonthTotal[] {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.month] = (map[e.month] ?? 0) + valueBrl(e);
  }
  const rows = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total, media3: null as number | null }));

  return rows.map((row, i) => {
    const slice = rows.slice(Math.max(0, i - 2), i + 1);
    const avg = slice.reduce((s, r) => s + r.total, 0) / slice.length;
    return { ...row, media3: Math.round(avg * 100) / 100 };
  });
}

function RankingTooltip({ active, payload }: { active?: boolean; payload?: readonly { value: number; payload: { name: string } }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover shadow-md px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-0.5">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">{formatBRL(payload[0].value)}</p>
    </div>
  );
}

function TimeTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { dataKey: string; value: number; color: string }[]; label?: string | number }) {
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

export function ExpensesByPrestador() {
  const urlSearchParams = useSearchParams();
  const cc = urlSearchParams.get("cc");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [selectedPrestadores, setSelectedPrestadores] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (monthFrom) params.set("month_from", monthFrom);
    if (monthTo) params.set("month_to", monthTo);
    if (cc) params.set("cost_center", cc);
    const res = await fetch(`/api/gastos?${params}`);
    const data = await res.json();
    setExpenses(data);
    setLoading(false);
  }, [monthFrom, monthTo, cc]);

  useEffect(() => { load(); }, [load]);

  // Todos os prestadores disponíveis (para o dropdown)
  const allRows = buildPrestadorRows(expenses);

  // Filtra as expenses pelo prestador selecionado
  const filteredExpenses = selectedPrestadores.length === 0
    ? expenses
    : expenses.filter((e) => {
        const key = normalizeName(e.description?.trim() || "Sem nome");
        return selectedPrestadores.includes(key);
      });

  const tableRows = buildPrestadorRows(filteredExpenses);
  const rankingData = buildRankingData(tableRows);
  const timeData = buildTimeData(filteredExpenses);

  const sumPureBrl = tableRows.reduce((s, r) => s + r.pureBrl, 0);
  const sumUsdAsBrl = tableRows.reduce((s, r) => s + r.usdAsBrl, 0);
  const sumTotalBrl = sumPureBrl + sumUsdAsBrl;
  const sumTotalUsd = tableRows.reduce((s, r) => s + r.totalUsd, 0);
  const anyUsd = tableRows.some((r) => r.hasUsd);

  function togglePrestador(key: string) {
    setSelectedPrestadores((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const dropdownLabel = selectedPrestadores.length === 0
    ? "Todos os prestadores"
    : selectedPrestadores.length === 1
      ? allRows.find((r) => r.name === selectedPrestadores[0])?.displayName ?? "1 selecionado"
      : `${selectedPrestadores.length} selecionados`;

  return (
    <div className="space-y-6">
      {/* Filtros de período + dropdown de prestadores */}
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
            Limpar datas
          </Button>
        )}

        {/* Multi-select de prestadores */}
        <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors",
              selectedPrestadores.length > 0
                ? "border-foreground text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
            )}>
              {dropdownLabel}
              <ChevronDown size={13} className="opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-72" align="start">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs text-muted-foreground">
                {allRows.length} prestadores
              </span>
              {selectedPrestadores.length > 0 && (
                <button
                  onClick={() => setSelectedPrestadores([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar seleção
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {allRows.map((row) => {
                const isSelected = selectedPrestadores.includes(row.name);
                return (
                  <button
                    key={row.name}
                    onClick={() => togglePrestador(row.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isSelected ? "bg-foreground border-foreground" : "border-border"
                    )}>
                      {isSelected && <Check size={10} className="text-background" />}
                    </div>
                    <span className="truncate">{row.displayName}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum dado para exibir.</p>
      ) : (
        <>
          {/* Gráfico 1: Ranking horizontal Top 20 */}
          {rankingData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="hub-card-title flex items-center gap-2">
                  <BarChart2 size={15} className="text-muted-foreground" />
                  {selectedPrestadores.length > 0 ? "Prestadores selecionados" : `Top ${Math.min(rankingData.length, 20)} prestadores`} por total (R$)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, rankingData.length * 28)}>
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + "…" : v}
                    />
                    <Tooltip content={RankingTooltip} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                    <Bar dataKey="total" maxBarSize={18} radius={[0, 3, 3, 0]}>
                      {rankingData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Gráfico 2: Total por mês (sem empilhar) */}
          {timeData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="hub-card-title flex items-center gap-2">
                  <TrendingUp size={15} className="text-muted-foreground" />
                  Gastos ao longo do tempo + Média móvel (3 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={timeData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={56} />
                    <Tooltip content={TimeTooltip} />
                    <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={40} />
                    <Line type="monotone" dataKey="media3" stroke="#ffffff" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tabela */}
      {!loading && expenses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="hub-card-title">Por prestador</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="hub-table-header text-left pb-2 pr-4">Nome</th>
                  <th className="hub-table-header text-right pb-2 px-3">Total</th>
                  {anyUsd && <th className="hub-table-header text-right pb-2 px-3">Total USD</th>}
                  <th className="hub-table-header text-left pb-2 pl-3">Categoria</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tableRows.map((row) => (
                  <tr key={row.name}>
                    <td className="py-2 pr-4">{row.displayName}</td>
                    <td className="py-2 px-3 text-right hub-number">{formatBRL(row.totalBrl)}</td>
                    {anyUsd && (
                      <td className="py-2 px-3 text-right hub-number text-muted-foreground">
                        {row.hasUsd ? formatUSD(row.totalUsd) : "—"}
                      </td>
                    )}
                    <td className="py-2 pl-3 text-muted-foreground text-xs">
                      {CATEGORY_LABELS[row.category] ?? row.category}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-3 pb-1 pr-4 text-xs text-muted-foreground">
                    {tableRows.length} prestador{tableRows.length !== 1 ? "es" : ""}
                  </td>
                  <td className="pt-3 pb-1 px-3 text-right hub-number text-muted-foreground">
                    {formatBRL(sumPureBrl)}
                  </td>
                  {anyUsd && (
                    <td className="pt-3 pb-1 px-3 text-right hub-number text-muted-foreground">
                      {sumTotalUsd > 0 ? formatUSD(sumTotalUsd) : "—"}
                    </td>
                  )}
                  <td className="pt-3 pb-1 pl-3"></td>
                </tr>
                {anyUsd ? (
                  <tr className="border-t-2 border-border">
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      Total geral em R$
                      <span className="block text-[10px] opacity-60">R$ + USD convertido</span>
                    </td>
                    <td className="py-2 px-3 text-right hub-number font-medium">{formatBRL(sumTotalBrl)}</td>
                    <td className="py-2 px-3 text-right hub-number text-xs text-muted-foreground">
                      ≈ {formatBRL(sumUsdAsBrl)} conv.
                    </td>
                    <td className="py-2 pl-3"></td>
                  </tr>
                ) : (
                  <tr className="border-t-2 border-border">
                    <td className="py-2 pr-4"></td>
                    <td className="py-2 px-3 text-right hub-number font-medium">{formatBRL(sumTotalBrl)}</td>
                    <td className="py-2 pl-3"></td>
                  </tr>
                )}
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
