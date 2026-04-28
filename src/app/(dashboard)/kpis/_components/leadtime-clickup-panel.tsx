"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { LeadtimeEditDialog } from "./leadtime-edit-dialog";
import type { KpiLeadtime } from "./leadtime-form-dialog";

export interface LeadtimeTaskRow {
  id: string;
  clickupTaskId: string;
  name: string;
  listId: string;
  costCenter: string;
  dataInicio: string | null;
  dataConclusao: string | null;
  leadtimeDias: number | null;
  dataGravInicio: string | null;
  dataGravFim: string | null;
  leadtimeGravacao: number | null;
  syncedAt: string;
  updatedAt: string;
}

interface UnifiedRow {
  id: string;
  fonte: "CLICKUP" | "MANUAL";
  nome: string;
  costCenter: string;
  dataInicio: string | null;
  dataGravInicio: string | null;
  dataGravFim: string | null;
  dataConclusao: string | null;
  leadtimeDias: number | null;
  leadtimeGravacao: number | null;
  rawClickup?: LeadtimeTaskRow;
  rawManual?: KpiLeadtime;
}

interface LeadtimeClickupPanelProps {
  costCenter: "ALURA" | "LATAM" | null;
  year: number;
  initialData: LeadtimeTaskRow[];
  initialManualData: KpiLeadtime[];
  isAdmin: boolean;
}

function diffDiasFromStr(d1: string | null, d2: string | null): number | null {
  if (!d1 || !d2) return null;
  const diff = Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86_400_000);
  return diff < 0 ? null : diff;
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
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function getYear(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function clickupToUnified(r: LeadtimeTaskRow): UnifiedRow {
  return {
    id: r.id, fonte: "CLICKUP", nome: r.name, costCenter: r.costCenter,
    dataInicio: r.dataInicio, dataGravInicio: r.dataGravInicio, dataGravFim: r.dataGravFim,
    dataConclusao: r.dataConclusao, leadtimeDias: r.leadtimeDias,
    leadtimeGravacao: r.leadtimeGravacao, rawClickup: r,
  };
}

function manualToUnified(r: KpiLeadtime): UnifiedRow {
  return {
    id: r.id, fonte: "MANUAL", nome: r.nome, costCenter: r.costCenter,
    dataInicio: r.dataInicio, dataGravInicio: r.inicioGravacao, dataGravFim: r.fimGravacao,
    dataConclusao: r.dataConclusao,
    leadtimeDias: diffDiasFromStr(r.dataInicio, r.dataConclusao),
    leadtimeGravacao: diffDiasFromStr(r.inicioGravacao, r.fimGravacao),
    rawManual: r,
  };
}

export function LeadtimeClickupPanel({
  costCenter,
  year,
  initialData,
  initialManualData,
  isAdmin,
}: LeadtimeClickupPanelProps) {
  const [tasks, setTasks] = useState<LeadtimeTaskRow[]>(initialData);
  const [manualTasks, setManualTasks] = useState<KpiLeadtime[]>(initialManualData);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClickup, setEditingClickup] = useState<LeadtimeTaskRow | null>(null);
  const [editingManual, setEditingManual] = useState<KpiLeadtime | null>(null);

  const dialogCostCenter = costCenter ?? "ALURA";

  const filtered = useMemo<UnifiedRow[]>(() => {
    const all = [...tasks.map(clickupToUnified), ...manualTasks.map(manualToUnified)];
    return all.filter((r) => {
      if (costCenter !== null && r.costCenter !== costCenter) return false;
      // Filtro de ano: baseia-se no ano de conclusão; sem conclusão = inclui sempre
      const conclusaoYear = getYear(r.dataConclusao);
      if (conclusaoYear !== null && conclusaoYear !== year) return false;
      return true;
    });
  }, [tasks, manualTasks, costCenter, year]);

  const validLeadtimes = useMemo(
    () => filtered.map((t) => t.leadtimeDias).filter((v): v is number => v !== null),
    [filtered]
  );

  const showGravacao = costCenter === "LATAM" || costCenter === null;
  const validGravacao = useMemo(
    () => filtered.map((t) => t.leadtimeGravacao).filter((v): v is number => v !== null),
    [filtered]
  );

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/kpis/leadtimes/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg({ text: data.error ?? "Erro ao sincronizar", error: true });
        return;
      }
      const parts = [`${data.created} criadas`, `${data.updated} atualizadas`, `${data.skipped} ignoradas`, `${data.filtered ?? 0} filtradas`, `${data.total} total`];
      setSyncMsg({ text: parts.join(" · "), error: false });
      if (data.statusSamples) console.warn("[leadtimes] statusSamples:", data.statusSamples);

      const qs = costCenter ? `?costCenter=${costCenter}` : "";
      const reload = await fetch(`/api/kpis/leadtimes${qs}`);
      if (reload.ok) setTasks(await reload.json());
    } catch (err) {
      setSyncMsg({ text: err instanceof Error ? err.message : "Erro de rede", error: true });
    } finally {
      setSyncing(false);
    }
  }

  async function handleClearAndSync() {
    if (!confirm("Isso vai apagar todos os dados do ClickUp e re-sincronizar do zero. Continuar?")) return;
    setClearing(true);
    setSyncMsg(null);
    try {
      const clearRes = await fetch("/api/kpis/leadtimes/clear", { method: "POST" });
      if (!clearRes.ok) {
        const d = await clearRes.json();
        setSyncMsg({ text: d.error ?? "Erro ao limpar", error: true });
        return;
      }
      setTasks([]);
    } finally {
      setClearing(false);
    }
    // Dispara sync imediatamente
    await handleSync();
  }

  function openAdd() {
    setEditingClickup(null);
    setEditingManual(null);
    setDialogOpen(true);
  }

  function openEditClickup(row: LeadtimeTaskRow) {
    setEditingManual(null);
    setEditingClickup(row);
    setDialogOpen(true);
  }

  function openEditManual(row: KpiLeadtime) {
    setEditingClickup(null);
    setEditingManual(row);
    setDialogOpen(true);
  }

  async function handleDeleteClickup(id: string) {
    if (!confirm("Apagar este curso do banco?")) return;
    await fetch(`/api/kpis/leadtimes/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleDeleteManual(id: string) {
    if (!confirm("Apagar este curso?")) return;
    await fetch(`/api/kpis/leadtime/${id}`, { method: "DELETE" });
    setManualTasks((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSavedClickup(saved: LeadtimeTaskRow) {
    setTasks((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
  }

  function handleSavedManual(saved: KpiLeadtime) {
    if (editingManual) {
      setManualTasks((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } else {
      setManualTasks((prev) => [saved, ...prev]);
    }
  }

  const th = "px-3 py-2 hub-table-header text-left whitespace-nowrap";
  const thR = "px-3 py-2 hub-table-header text-center whitespace-nowrap";
  const td = "px-3 py-2 text-sm whitespace-nowrap";
  const tdC = "px-3 py-2 text-sm text-center tabular-nums whitespace-nowrap";
  const gravCols = showGravacao ? 3 : 0;
  const actionCols = isAdmin ? 1 : 0;
  const colSpan = 4 + gravCols + actionCols;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {syncMsg && (
            <p className={`text-xs flex items-center gap-1 ${syncMsg.error ? "text-destructive" : "text-muted-foreground"}`}>
              {syncMsg.error && <AlertTriangle size={12} />}
              {syncMsg.text}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus size={13} className="mr-1" /> Adicionar curso
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing || clearing}>
              <RefreshCw size={13} className={"mr-1.5 " + (syncing ? "animate-spin" : "")} />
              {syncing ? "Sincronizando..." : "Sincronizar ClickUp"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAndSync} disabled={syncing || clearing}>
              <RotateCcw size={13} className={"mr-1.5 " + (clearing ? "animate-spin" : "")} />
              {clearing ? "Limpando..." : "Limpar e re-sincronizar"}
            </Button>
          </div>
        )}
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total" value={String(filtered.length)} />
        <MetricCard
          label="Com leadtime"
          value={String(validLeadtimes.length)}
          hint={validLeadtimes.length !== filtered.length ? `${filtered.length - validLeadtimes.length} sem dados` : undefined}
        />
        <MetricCard label="Leadtime médio" value={`${fmtDias(avg(validLeadtimes))} d`} />
        <MetricCard label="Leadtime mediano" value={`${fmtDias(median(validLeadtimes))} d`} />
      </div>

      {showGravacao && validGravacao.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Com gravação" value={String(validGravacao.length)} />
          <MetricCard label="Gravação média" value={`${fmtDias(avg(validGravacao))} d`} />
          <MetricCard label="Gravação mediana" value={`${fmtDias(median(validGravacao))} d`} />
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className={th}>Curso</th>
              <th className={th}>Centro de custo</th>
              <th className={thR}>Início</th>
              <th className={thR}>Conclusão</th>
              <th className={thR}>Leadtime (d)</th>
              {showGravacao && (
                <>
                  <th className={thR}>Grav. início</th>
                  <th className={thR}>Grav. fim</th>
                  <th className={thR}>Grav. (d)</th>
                </>
              )}
              {isAdmin && <th className={thR} />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum registro para {year}. Clique em &quot;Sincronizar ClickUp&quot; ou &quot;Adicionar curso&quot;.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={`${row.fonte}-${row.id}`} className="border-b hover:bg-muted/20">
                <td className={td + " max-w-[300px] truncate"} title={row.nome}>{row.nome}</td>
                <td className={td + " text-muted-foreground"}>{row.costCenter}</td>
                <td className={tdC + " text-muted-foreground"}>{fmtDate(row.dataInicio)}</td>
                <td className={tdC + " text-muted-foreground"}>{fmtDate(row.dataConclusao)}</td>
                <td className={tdC + " font-medium"}>{fmtDias(row.leadtimeDias)}</td>
                {showGravacao && (
                  <>
                    <td className={tdC + " text-muted-foreground"}>{fmtDate(row.dataGravInicio)}</td>
                    <td className={tdC + " text-muted-foreground"}>{fmtDate(row.dataGravFim)}</td>
                    <td className={tdC}>{fmtDias(row.leadtimeGravacao)}</td>
                  </>
                )}
                {isAdmin && (
                  <td className="px-3 py-1 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => row.fonte === "CLICKUP" ? openEditClickup(row.rawClickup!) : openEditManual(row.rawManual!)}
                      >
                        <Pencil size={11} />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => row.fonte === "CLICKUP" ? handleDeleteClickup(row.id) : handleDeleteManual(row.id)}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LeadtimeEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCostCenter={dialogCostCenter}
        editingClickup={editingClickup}
        editingManual={editingManual}
        onSavedClickup={handleSavedClickup}
        onSavedManual={handleSavedManual}
      />
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-3 space-y-1">
      <p className="text-[10px] font-mono uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="hub-number text-2xl font-light">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
