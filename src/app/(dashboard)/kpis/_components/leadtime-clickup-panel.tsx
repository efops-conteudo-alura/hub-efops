"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

export interface LeadtimeTaskRow {
  id: string;
  clickupTaskId: string;
  name: string;
  listId: string;
  regiao: string;
  dataInicio: string | null;
  dataConclusao: string | null;
  leadtimeDias: number | null;
  dataGravInicio: string | null;
  dataGravFim: string | null;
  leadtimeGravacao: number | null;
  syncedAt: string;
  updatedAt: string;
}

interface LeadtimeClickupPanelProps {
  costCenter: "ALURA" | "LATAM" | null;
  initialData: LeadtimeTaskRow[];
  isAdmin: boolean;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

function fmtDias(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

export function LeadtimeClickupPanel({
  costCenter,
  initialData,
  isAdmin,
}: LeadtimeClickupPanelProps) {
  const [tasks, setTasks] = useState<LeadtimeTaskRow[]>(initialData);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  // Filtra pelo cost center ativo
  const filtered = useMemo(() => {
    if (costCenter === null) return tasks;
    return tasks.filter((t) => t.regiao === costCenter);
  }, [tasks, costCenter]);

  const validLeadtimes = useMemo(
    () => filtered.map((t) => t.leadtimeDias).filter((v): v is number => v !== null),
    [filtered]
  );

  const totalTasks = filtered.length;
  const tasksComLeadtime = validLeadtimes.length;
  const leadtimeMedio = avg(validLeadtimes);
  const leadtimeMediano = median(validLeadtimes);

  // Para LATAM: também mostra leadtime de gravação
  const showGravacao = costCenter === "LATAM";
  const validGravacao = useMemo(
    () =>
      filtered.map((t) => t.leadtimeGravacao).filter((v): v is number => v !== null),
    [filtered]
  );
  const gravacaoMedio = avg(validGravacao);
  const gravacaoMediano = median(validGravacao);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncSummary(null);
    try {
      const res = await fetch("/api/kpis/leadtimes/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setSyncError(data.error || "Erro ao sincronizar");
        return;
      }

      const parts = [
        `${data.created} criadas`,
        `${data.updated} atualizadas`,
        `${data.skipped} ignoradas`,
        `${data.total} no total`,
      ];
      setSyncSummary(parts.join(" · "));

      // Recarrega as tasks após sincronizar
      const reload = await fetch(
        costCenter ? `/api/kpis/leadtimes?regiao=${costCenter}` : "/api/kpis/leadtimes"
      );
      if (reload.ok) {
        const updated = await reload.json();
        setTasks(updated);
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setSyncing(false);
    }
  }

  const th = "px-3 py-2 hub-table-header text-left whitespace-nowrap";
  const thRight = "px-3 py-2 hub-table-header text-center whitespace-nowrap";
  const td = "px-3 py-2 text-sm whitespace-nowrap";
  const tdCenter = "px-3 py-2 text-sm text-center tabular-nums whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* Header com botão de sync */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">
            Sincronizado do ClickUp
          </p>
          {syncSummary && !syncError && (
            <p className="text-xs text-muted-foreground">{syncSummary}</p>
          )}
          {syncError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle size={12} /> {syncError}
            </p>
          )}
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              size={13}
              className={"mr-1.5 " + (syncing ? "animate-spin" : "")}
            />
            {syncing ? "Sincronizando..." : "Sincronizar ClickUp"}
          </Button>
        )}
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total de tasks" value={String(totalTasks)} />
        <MetricCard
          label="Com leadtime"
          value={String(tasksComLeadtime)}
          hint={
            tasksComLeadtime !== totalTasks
              ? `${totalTasks - tasksComLeadtime} sem dados completos`
              : undefined
          }
        />
        <MetricCard label="Leadtime médio" value={`${fmtDias(leadtimeMedio)} d`} />
        <MetricCard label="Leadtime mediano" value={`${fmtDias(leadtimeMediano)} d`} />
      </div>

      {showGravacao && validGravacao.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Tasks com gravação" value={String(validGravacao.length)} />
          <MetricCard label="Gravação média" value={`${fmtDias(gravacaoMedio)} d`} />
          <MetricCard
            label="Gravação mediana"
            value={`${fmtDias(gravacaoMediano)} d`}
          />
        </div>
      )}

      {/* Tabela de tasks */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className={th}>Curso</th>
              <th className={th}>Região</th>
              <th className={thRight}>Início</th>
              <th className={thRight}>Conclusão</th>
              <th className={thRight}>Leadtime (d)</th>
              {showGravacao && (
                <>
                  <th className={thRight}>Grav. início</th>
                  <th className={thRight}>Grav. fim</th>
                  <th className={thRight}>Grav. (d)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={showGravacao ? 8 : 5}
                  className="px-3 py-6 text-center text-sm text-muted-foreground"
                >
                  Nenhuma task sincronizada. Clique em &quot;Sincronizar ClickUp&quot; para começar.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/20">
                <td className={td + " max-w-[320px] truncate"} title={row.name}>
                  {row.name}
                </td>
                <td className={td + " text-muted-foreground"}>{row.regiao}</td>
                <td className={tdCenter + " text-muted-foreground"}>
                  {fmtDate(row.dataInicio)}
                </td>
                <td className={tdCenter + " text-muted-foreground"}>
                  {fmtDate(row.dataConclusao)}
                </td>
                <td className={tdCenter + " font-medium"}>
                  {fmtDias(row.leadtimeDias)}
                </td>
                {showGravacao && (
                  <>
                    <td className={tdCenter + " text-muted-foreground"}>
                      {fmtDate(row.dataGravInicio)}
                    </td>
                    <td className={tdCenter + " text-muted-foreground"}>
                      {fmtDate(row.dataGravFim)}
                    </td>
                    <td className={tdCenter}>{fmtDias(row.leadtimeGravacao)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3 space-y-1">
      <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wide">
        {label}
      </p>
      <p className="hub-number text-2xl font-light">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
