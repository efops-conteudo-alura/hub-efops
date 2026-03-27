"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CarreirasSyncButton, type CarreiraLevel, type SyncResult } from "./carreiras-sync-button";
import { CheckCircle2, Clock, ExternalLink, Sparkles } from "lucide-react";

export type { CarreiraLevel };

interface CarreirasPanelProps {
  initialLevels: CarreiraLevel[];
  onSynced?: (result: SyncResult) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isNew(level: CarreiraLevel, previousSyncAt: string | null): boolean {
  if (!previousSyncAt) return false;
  // Nível recém publicado desde o sync anterior
  if (level.firstPublishedAt && new Date(level.firstPublishedAt) > new Date(previousSyncAt)) return true;
  // Nível nunca visto antes (carreira nova ou nível novo em breve)
  if (new Date(level.createdAt) > new Date(previousSyncAt)) return true;
  return false;
}

export function CarreirasPanel({ initialLevels, onSynced }: CarreirasPanelProps) {
  const [levels, setLevels] = useState<CarreiraLevel[]>(initialLevels);
  const [filter, setFilter] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [previousSyncAt, setPreviousSyncAt] = useState<string | null>(null);

  function handleSynced(result: SyncResult) {
    setLevels(result.levels);
    setLastSync(result.syncedAt);
    setPreviousSyncAt(result.previousSyncAt);
    onSynced?.(result);
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

  // Agrupa por carreira
  const grouped = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; levels: CarreiraLevel[] }>();
    for (const level of filtered) {
      if (!map.has(level.carreiraSlug)) {
        map.set(level.carreiraSlug, { slug: level.carreiraSlug, name: level.carreiraName, levels: [] });
      }
      map.get(level.carreiraSlug)!.levels.push(level);
    }
    return Array.from(map.values());
  }, [filtered]);

  const publishedCount = levels.filter((l) => l.isPublished).length;
  const newCount = previousSyncAt ? levels.filter((l) => isNew(l, previousSyncAt)).length : 0;

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
          {newCount > 0 && (
            <span className="text-foreground hub-number flex items-center gap-1">
              <Sparkles size={13} /> {newCount} novos
            </span>
          )}
          <span><span className="hub-number text-foreground">{publishedCount}</span> publicados</span>
          <span><span className="hub-number text-foreground">{levels.length - publishedCount}</span> em breve</span>
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

          <div className="space-y-6">
            {grouped.map((career) => {
              const careerIsNew = previousSyncAt
                ? career.levels.every((l) => new Date(l.createdAt) > new Date(previousSyncAt!))
                : false;

              return (
                <div key={career.slug} className="rounded-md border overflow-hidden">
                  {/* Cabeçalho da carreira */}
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/50 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{career.name}</span>
                      {careerIsNew && (
                        <Badge variant="default" className="gap-1 text-xs py-0 font-mono uppercase tracking-wider">
                          <Sparkles size={10} /> NOVO
                        </Badge>
                      )}
                    </div>
                    <a
                      href={`https://www.alura.com.br/carreiras/${career.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Ver carreira <ExternalLink size={11} />
                    </a>
                  </div>

                  {/* Níveis */}
                  <div className="divide-y">
                    {career.levels.map((level) => {
                      const levelIsNew = isNew(level, previousSyncAt);
                      return (
                        <div key={level.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{level.levelName}</span>
                            {levelIsNew && !careerIsNew && (
                              <Badge variant="default" className="gap-1 text-xs py-0 shrink-0">
                                <Sparkles size={10} /> NOVO
                              </Badge>
                            )}
                          </div>
                          <div className="shrink-0">
                            {level.isPublished ? (
                              <Badge variant="default" className="gap-1 font-mono uppercase tracking-wider">
                                <CheckCircle2 size={11} /> Publicado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 font-mono uppercase tracking-wider">
                                <Clock size={11} /> Em breve
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                            {formatDate(level.firstPublishedAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
