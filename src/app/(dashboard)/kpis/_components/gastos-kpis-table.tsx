"use client";

import { fmtMonthShort } from "./producao-table";

interface GastoEntry {
  month: string;
  value: number;
  currency: string;
  exchangeRate: number | null;
}

interface GastosKpisTableProps {
  year: number;
  label: string;
  data: GastoEntry[];
}

function valueBrl(e: GastoEntry): number {
  if (e.currency === "USD") return e.exchangeRate ? e.value * e.exchangeRate : 0;
  return e.value;
}

function fmtBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function allMonthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function GastosKpisTable({ year, label, data }: GastosKpisTableProps) {
  const allMonths = allMonthsOfYear(year);

  const byMonth = new Map<string, number>();
  for (const e of data) {
    byMonth.set(e.month, (byMonth.get(e.month) ?? 0) + valueBrl(e));
  }

  const yearTotal = allMonths.reduce((s, m) => s + (byMonth.get(m) ?? 0), 0);
  const hasData = allMonths.some((m) => byMonth.has(m));

  const colHeader = "px-3 py-2 hub-table-header text-center whitespace-nowrap";
  const cell = "px-3 py-2 text-sm text-center tabular-nums";
  const thTotal = "px-3 py-2 hub-table-header text-center whitespace-nowrap border-l";
  const tdTotal = "px-3 py-2 text-sm text-center tabular-nums border-l";
  const rowLabel = "px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap w-48";

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 hub-table-header text-left w-48" />
            {allMonths.map((m) => (
              <th key={m} className={colHeader}>
                {fmtMonthShort(m)}
              </th>
            ))}
            <th className={thTotal + " text-muted-foreground"}>Total no Ano</th>
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-muted/20">
            <td className={rowLabel}>{label}</td>
            {allMonths.map((m) => {
              const v = byMonth.get(m);
              return (
                <td key={m} className={cell + " text-muted-foreground"}>
                  {v !== undefined ? (
                    <span className="text-foreground">{fmtBrl(v)}</span>
                  ) : (
                    "—"
                  )}
                </td>
              );
            })}
            <td className={tdTotal + " font-semibold"}>
              {hasData ? fmtBrl(yearTotal) : <span className="text-muted-foreground">—</span>}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
