"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const CATEGORIES = [
  { key: "INSTRUTOR", label: "Instrutor", color: "#6366f1" },
  { key: "EDITOR_FREELANCER", label: "Editor Freelancer", color: "#f59e0b" },
  { key: "EDITOR_EXTERNO", label: "Editor Externo", color: "#10b981" },
  { key: "SUPORTE_EDUCACIONAL", label: "Suporte Educacional", color: "#f43f5e" },
  { key: "OUTROS", label: "Outros", color: "#64748b" },
];

export type GastosChartRow = {
  month: string;
  INSTRUTOR?: number;
  EDITOR_FREELANCER?: number;
  EDITOR_EXTERNO?: number;
  SUPORTE_EDUCACIONAL?: number;
  OUTROS?: number;
};

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  return `${month}/${year.slice(2)}`;
}

function GastosTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { dataKey: string; value: number; color: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((e) => e.value > 0);
  if (!items.length) return null;
  return (
    <div className="rounded-md border bg-popover shadow-md px-3 py-2 text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{formatMonth(String(label))}</p>
      {items.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {CATEGORIES.find((c) => c.key === entry.dataKey)?.label ?? entry.dataKey}:{" "}
          <span className="font-medium">{entry.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}</span>
        </p>
      ))}
    </div>
  );
}

export function GastosChart({ data }: { data: GastosChartRow[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8 italic">
        Nenhum dado de gastos nos últimos 6 meses.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11 }}
          width={52}
        />
        <Tooltip content={GastosTooltip} />
        <Legend formatter={(v) => CATEGORIES.find((c) => c.key === v)?.label ?? v} wrapperStyle={{ fontSize: 11, background: "hsl(var(--card) / 0.85)", borderRadius: 6, padding: "2px 8px", border: "1px solid hsl(var(--border))" }} />
        {CATEGORIES.map((cat) => (
          <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
