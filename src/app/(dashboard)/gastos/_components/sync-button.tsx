"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  onSynced: () => void;
}

export function SyncClickUpButton({ onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function handleSync() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/gastos/sync-clickup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao sincronizar");
      setResult(`${json.inserted} inseridos, ${json.updated} atualizados, ${json.skipped} ignorados`);
      onSynced();
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={handleSync} disabled={loading}>
        <RefreshCw size={15} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Sincronizando..." : "Sincronizar ClickUp"}
      </Button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  );
}
