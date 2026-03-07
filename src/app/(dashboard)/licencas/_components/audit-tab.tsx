"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Edição",
  DELETE: "Exclusão",
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  planName: "Plano",
  cost: "Valor",
  currency: "Moeda",
  billingCycle: "Ciclo",
  costCenter: "Centro de Custo",
  team: "Time",
  responsible: "Responsável",
  isActive: "Status",
  renewalDate: "Renovação",
  url: "URL",
  loginUser: "Login",
  notes: "Notas",
};

interface AuditEntry {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  userId: string;
  userName: string;
  action: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Ativa" : "Inativa";
  return String(val);
}

export function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions/audit")
      .then((r) => r.json())
      .then((data) => { setEntries(data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>;
  if (entries.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center italic">Nenhuma alteração registada.</p>;

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Data/hora</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Utilizador</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Assinatura</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Ação</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Alterações</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-muted/20">
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap font-mono">
                {new Date(e.createdAt).toLocaleString("pt-BR")}
              </td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{e.userName}</td>
              <td className="px-3 py-2 text-sm whitespace-nowrap">{e.subscriptionName}</td>
              <td className="px-3 py-2">
                <Badge variant={ACTION_VARIANTS[e.action] ?? "secondary"} className="text-xs">
                  {ACTION_LABELS[e.action] ?? e.action}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {e.changes && Object.keys(e.changes).length > 0 ? (
                  <ul className="space-y-0.5">
                    {Object.entries(e.changes).map(([field, { from, to }]) => (
                      <li key={field} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{FIELD_LABELS[field] ?? field}:</span>{" "}
                        <span className="line-through opacity-60">{formatValue(from)}</span>
                        {" → "}
                        <span>{formatValue(to)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
