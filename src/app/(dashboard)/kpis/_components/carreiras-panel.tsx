"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CarreirasSyncButton } from "./carreiras-sync-button";
import { CheckCircle2, Clock } from "lucide-react";

export interface CarreiraLevel {
  id: string;
  carreiraSlug: string;
  carreiraName: string;
  levelName: string;
  isPublished: boolean;
  firstPublishedAt: string | null;
  updatedAt: string;
}

interface SyncResult {
  syncedAt: string;
  careersProcessed: number;
  levelsProcessed: number;
  newPublished: number;
  levels: CarreiraLevel[];
}

interface CarreirasPanelProps {
  initialLevels: CarreiraLevel[];
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CarreirasPanel({ initialLevels }: CarreirasPanelProps) {
  const [levels, setLevels] = useState<CarreiraLevel[]>(initialLevels);
  const [filter, setFilter] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);

  function handleSynced(result: SyncResult) {
    setLevels(result.levels);
    setLastSync(result.syncedAt);
  }

  const filtered = useMemo(() => {
    if (!filter.trim()) return levels;
    const q = filter.toLowerCase();
    return levels.filter(
      (l) =>
        l.carreiraName.toLowerCase().includes(q) ||
        l.levelName.toLowerCase().includes(q)
    );
  }, [levels, filter]);

  const publishedCount = levels.filter((l) => l.isPublished).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <CarreirasSyncButton onSynced={handleSynced} />
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Última sync: {formatDate(lastSync)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{publishedCount}</span> publicados</span>
          <span><span className="font-semibold text-foreground">{levels.length - publishedCount}</span> em breve</span>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          Nenhum dado ainda. Clique em "Sincronizar Alura" para buscar todas as carreiras.
        </div>
      ) : (
        <>
          <Input
            placeholder="Filtrar por carreira ou nível..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carreira</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Detectado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((level) => (
                  <TableRow key={level.id}>
                    <TableCell className="font-medium text-sm">{level.carreiraName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{level.levelName}</TableCell>
                    <TableCell className="text-center">
                      {level.isPublished ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 size={11} /> Publicado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock size={11} /> Em breve
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(level.firstPublishedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
