"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CarreiraLevel {
  id: string;
  carreiraSlug: string;
  carreiraName: string;
  levelName: string;
  order: number;
  isPublished: boolean;
  firstPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  syncedAt: string;
  previousSyncAt: string | null;
  careersProcessed: number;
  levelsProcessed: number;
  newPublished: number;
  levels: CarreiraLevel[];
}

interface CarreirasSyncButtonProps {
  onSynced: (result: SyncResult) => void;
}

export function CarreirasSyncButton({ onSynced }: CarreirasSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  async function handleSync() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/kpis/carreiras/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Erro ao sincronizar");
        return;
      }
      setResult(
        `${data.careersProcessed} carreiras · ${data.levelsProcessed} níveis · ${data.newPublished} recém publicados`
      );
      onSynced(data);
    } catch {
      setResult("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={handleSync} disabled={loading}>
        <RefreshCw size={14} className={cn("mr-2", loading && "animate-spin")} />
        {loading ? "Sincronizando..." : "Sincronizar Alura"}
      </Button>
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
    </div>
  );
}
