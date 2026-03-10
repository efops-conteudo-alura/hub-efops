"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, Search, Sparkles, ClipboardCopy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "trilhas_last_sync";

interface Trilha {
  id: string;
  slug: string;
  nome: string;
  categoria: string | null;
  numCursos: number | null;
  cargaHoraria: number | null;
  createdAt: string;
}

type SortField = "nome" | "categoria" | "numCursos" | "cargaHoraria";

export function TrilhasTab({ isAdmin }: { isAdmin: boolean }) {
  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [previousSyncAt, setPreviousSyncAt] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "numCursos" || field === "cargaHoraria" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    return [...trilhas].sort((a, b) => {
      let cmp = 0;
      if (sortField === "nome") cmp = a.nome.localeCompare(b.nome, "pt-BR");
      else if (sortField === "categoria") cmp = (a.categoria ?? "").localeCompare(b.categoria ?? "", "pt-BR");
      else if (sortField === "numCursos") cmp = (a.numCursos ?? 0) - (b.numCursos ?? 0);
      else if (sortField === "cargaHoraria") cmp = (a.cargaHoraria ?? 0) - (b.cargaHoraria ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [trilhas, sortField, sortDir]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/publicacoes/trilhas?${params}`);
    const data = await res.json();
    setTrilhas(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/publicacoes/trilhas/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Erro ao sincronizar");
        return;
      }
      // Guardar previousSyncAt antes de actualizar
      const prev = localStorage.getItem(STORAGE_KEY);
      setPreviousSyncAt(prev);
      if (data.syncedAt) localStorage.setItem(STORAGE_KEY, data.syncedAt);
      if (Array.isArray(data.trilhas)) {
        setTrilhas(data.trilhas);
      } else {
        load();
      }
      setSyncResult(
        `${data.slugsFound} trilhas encontradas · ${data.newTrilhasProcessed} novas`
      );
    } catch {
      setSyncResult("Erro de conexão");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCopy() {
    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const html = [
      "<table>",
      "<tr><th>Nome</th><th>Categoria</th><th>Cursos</th><th>Carga Horária</th></tr>",
      ...sorted.map((t) =>
        `<tr><td><a href="https://www.alura.com.br/formacao-${t.slug}">${esc(t.nome)}</a></td><td>${esc(t.categoria ?? "")}</td><td>${t.numCursos ?? ""}</td><td>${t.cargaHoraria != null ? `${t.cargaHoraria}h` : ""}</td></tr>`
      ),
      "</table>",
    ].join("\n");
    const plain = [
      ["Nome", "Categoria", "Cursos", "Carga Horária", "Link"].join("\t"),
      ...sorted.map((t) =>
        [t.nome, t.categoria ?? "", t.numCursos ?? "", t.cargaHoraria != null ? `${t.cargaHoraria}h` : "", `https://www.alura.com.br/formacao-${t.slug}`].join("\t")
      ),
    ].join("\n");
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function isNew(trilha: Trilha): boolean {
    if (!previousSyncAt) return false;
    return new Date(trilha.createdAt) > new Date(previousSyncAt);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  return (
    <div className="space-y-5">
      {/* Busca + botão sync */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {previousSyncAt && sorted.filter(isNew).length > 0 && (
            <span className="text-primary font-semibold text-sm flex items-center gap-1">
              <Sparkles size={13} /> {sorted.filter(isNew).length} novas
            </span>
          )}
          {sorted.length > 0 && !loading && (
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check size={14} className="mr-2 text-green-500" /> : <ClipboardCopy size={14} className="mr-2" />}
              {copied ? "Copiado!" : "Copiar dados"}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={14} className={cn("mr-2", syncing && "animate-spin")} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
              {syncResult && <p className="text-xs text-muted-foreground">{syncResult}</p>}
            </>
          )}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : trilhas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          {isAdmin
            ? 'Nenhuma trilha encontrada. Clique em "Sincronizar" para buscar as trilhas da Alura.'
            : "Nenhuma trilha encontrada."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 pr-4">
                  <button onClick={() => handleSort("nome")} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Nome <SortIcon field="nome" />
                  </button>
                </th>
                <th className="text-left pb-2 px-3">
                  <button onClick={() => handleSort("categoria")} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Categoria <SortIcon field="categoria" />
                  </button>
                </th>
                <th className="text-right pb-2 px-3">
                  <button onClick={() => handleSort("numCursos")} className="flex items-center justify-end gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Cursos <SortIcon field="numCursos" />
                  </button>
                </th>
                <th className="text-right pb-2 pl-3">
                  <button onClick={() => handleSort("cargaHoraria")} className="flex items-center justify-end gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Carga Horária <SortIcon field="cargaHoraria" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((trilha) => (
                <tr key={trilha.id}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.alura.com.br/formacao-${trilha.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary transition-colors flex items-start gap-1.5 group"
                      >
                        {trilha.nome}
                        <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {isNew(trilha) && (
                        <Badge variant="default" className="gap-1 text-xs py-0 shrink-0">
                          <Sparkles size={10} /> NOVO
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-sm">
                    {trilha.categoria || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">
                    {trilha.numCursos ?? "—"}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-muted-foreground tabular-nums">
                    {trilha.cargaHoraria != null ? `${trilha.cargaHoraria}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">{sorted.length} trilhas</p>
        </div>
      )}
    </div>
  );
}
