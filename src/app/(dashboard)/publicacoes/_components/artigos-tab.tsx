"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, ClipboardCopy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthPicker } from "@/app/(dashboard)/gastos/_components/month-picker";

const CATEGORIES = [
  "Programação",
  "Front-end",
  "Data Science",
  "Inteligência Artificial",
  "DevOps",
  "UX & Design",
  "Mobile",
  "Inovação & Gestão",
];

interface Artigo {
  id: string;
  slug: string;
  nome: string;
  autor: string | null;
  categoria: string | null;
  dataPublicacao: string | null;
  dataModificacao: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentQuarterRange() {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3);
  return {
    from: `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, "0")}`,
    to: `${d.getFullYear()}-${String(q * 3 + 3).padStart(2, "0")}`,
  };
}

function getCurrentWeekRange() {
  const today = new Date();
  const daysToMonday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

type SortField = "nome" | "autor" | "dataPublicacao" | "dataModificacao";
type DatePreset = "semana" | "mes" | "trimestre";

export function ArtigosTab({ isAdmin }: { isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  const router = useRouter();
  const pathname = usePathname();

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [monthFrom, setMonthFrom] = useState(() => searchParams.get("a_mf") ?? "");
  const [monthTo, setMonthTo] = useState(() => searchParams.get("a_mt") ?? "");
  const [selectedCat, setSelectedCat] = useState(() => searchParams.get("a_cat") ?? "");
  const [sortField, setSortField] = useState<SortField>(() => {
    const sf = searchParams.get("a_sf");
    return (sf === "nome" || sf === "autor" || sf === "dataModificacao") ? sf as SortField : "dataPublicacao";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("a_sd") === "asc" ? "asc" : "desc"
  );
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);
  const [weekFilter, setWeekFilter] = useState<{ from: string; to: string } | null>(null);

  // Sincroniza estado → URL (merge com params das outras abas)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    if (monthFrom) params.set("a_mf", monthFrom); else params.delete("a_mf");
    if (monthTo) params.set("a_mt", monthTo); else params.delete("a_mt");
    if (selectedCat) params.set("a_cat", selectedCat); else params.delete("a_cat");
    if (sortField !== "dataPublicacao") params.set("a_sf", sortField); else params.delete("a_sf");
    if (sortDir !== "desc") params.set("a_sd", sortDir); else params.delete("a_sd");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
   
  }, [monthFrom, monthTo, selectedCat, sortField, sortDir, router, pathname]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "dataPublicacao" || field === "dataModificacao" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    return [...artigos].sort((a, b) => {
      let cmp = 0;
      if (sortField === "nome") cmp = a.nome.localeCompare(b.nome, "pt-BR");
      else if (sortField === "autor") cmp = (a.autor ?? "").localeCompare(b.autor ?? "", "pt-BR");
      else if (sortField === "dataPublicacao") cmp = (a.dataPublicacao ?? "").localeCompare(b.dataPublicacao ?? "");
      else if (sortField === "dataModificacao") cmp = (a.dataModificacao ?? "").localeCompare(b.dataModificacao ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [artigos, sortField, sortDir]);

  const displayed = useMemo(() => {
    if (!weekFilter) return sorted;
    return sorted.filter((a) => {
      if (!a.dataPublicacao) return false;
      const d = a.dataPublicacao.slice(0, 10);
      return d >= weekFilter.from && d <= weekFilter.to;
    });
  }, [sorted, weekFilter]);

  function handlePreset(preset: DatePreset) {
    if (activePreset === preset) {
      setActivePreset(null);
      setMonthFrom("");
      setMonthTo("");
      setWeekFilter(null);
      return;
    }
    setActivePreset(preset);
    if (preset === "mes") {
      const m = getCurrentMonth();
      setMonthFrom(m);
      setMonthTo(m);
      setWeekFilter(null);
    } else if (preset === "trimestre") {
      const { from, to } = getCurrentQuarterRange();
      setMonthFrom(from);
      setMonthTo(to);
      setWeekFilter(null);
    } else {
      const m = getCurrentMonth();
      setMonthFrom(m);
      setMonthTo(m);
      setWeekFilter(getCurrentWeekRange());
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (monthFrom) params.set("month_from", monthFrom);
      if (monthTo) params.set("month_to", monthTo);
      if (selectedCat) params.set("categoria", selectedCat);
      const res = await fetch(`/api/publicacoes/artigos?${params}`);
      const data = await res.json();
      setArtigos(Array.isArray(data) ? data : []);
    } catch {
      setArtigos([]);
    } finally {
      setLoading(false);
    }
  }, [monthFrom, monthTo, selectedCat]);

  useEffect(() => { load(); }, [load]);

  async function handleCopy() {
    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const html = [
      "<table>",
      "<tr><th>Nome</th><th>Categoria</th><th>Autor</th><th>Publicação</th><th>Atualização</th></tr>",
      ...displayed.map((a) =>
        `<tr><td><a href="https://www.alura.com.br/artigos/${a.slug}">${esc(a.nome)}</a></td><td>${esc(a.categoria ?? "")}</td><td>${esc(a.autor ?? "")}</td><td>${formatDate(a.dataPublicacao)}</td><td>${formatDate(a.dataModificacao)}</td></tr>`
      ),
      "</table>",
    ].join("\n");
    const plain = [
      ["Nome", "Categoria", "Autor", "Publicação", "Atualização", "Link"].join("\t"),
      ...displayed.map((a) =>
        [a.nome, a.categoria ?? "", a.autor ?? "", formatDate(a.dataPublicacao), formatDate(a.dataModificacao), `https://www.alura.com.br/artigos/${a.slug}`].join("\t")
      ),
    ].join("\n");
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(plain).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/publicacoes/artigos/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Erro ao sincronizar");
        return;
      }
      setSyncResult(
        `${data.slugsFound} artigos encontrados · ${data.newArtigosProcessed} novos · ${data.existingUpdated} atualizados`
      );
      load();
    } catch {
      setSyncResult("Erro de conexão");
    } finally {
      setSyncing(false);
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  return (
    <div className="space-y-5">
      {/* Filtros de data + botão sync */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <MonthPicker value={monthFrom} onChange={(v) => { setMonthFrom(v); setActivePreset(null); setWeekFilter(null); }} placeholder="Início" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <MonthPicker value={monthTo} onChange={(v) => { setMonthTo(v); setActivePreset(null); setWeekFilter(null); }} placeholder="Fim" />
        </div>
        {(["semana", "mes", "trimestre"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            className={cn(
              "h-8 px-3 rounded-md border text-xs transition-colors",
              activePreset === preset
                ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            )}
          >
            {preset === "semana" ? "Semana atual" : preset === "mes" ? "Mês atual" : "Trimestre atual"}
          </button>
        ))}
        {(monthFrom || monthTo || selectedCat) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonthFrom(""); setMonthTo(""); setSelectedCat(""); setActivePreset(null); setWeekFilter(null); }}>
            Limpar tudo
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
          {displayed.length > 0 && !loading && (
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

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat("")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            selectedCat === ""
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          )}
        >
          Todas
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(selectedCat === cat ? "" : cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selectedCat === cat
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Contagem */}
      {!loading && displayed.length > 0 && (
        <p className="hub-number text-2xl font-bold text-foreground">
          {displayed.length} <span className="text-base font-normal text-muted-foreground">artigos</span>
        </p>
      )}

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : artigos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          {isAdmin
            ? 'Nenhum artigo encontrado. Clique em "Sincronizar" para buscar os artigos da Alura.'
            : "Nenhum artigo encontrado para os filtros selecionados."}
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
                  <button onClick={() => handleSort("autor")} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Autor <SortIcon field="autor" />
                  </button>
                </th>
                <th className="text-right pb-2 px-3">
                  <button onClick={() => handleSort("dataPublicacao")} className="flex items-center justify-end gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Publicação <SortIcon field="dataPublicacao" />
                  </button>
                </th>
                <th className="text-right pb-2 pl-3">
                  <button onClick={() => handleSort("dataModificacao")} className="flex items-center justify-end gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Atualização <SortIcon field="dataModificacao" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((artigo) => (
                <tr key={artigo.id}>
                  <td className="py-2.5 pr-4">
                    <a
                      href={`https://www.alura.com.br/artigos/${artigo.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-foreground transition-colors flex items-start gap-1.5 group"
                    >
                      {artigo.nome}
                      <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {artigo.categoria && (
                      <span className="text-xs text-muted-foreground">{artigo.categoria}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-sm">
                    {artigo.autor || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground font-mono text-xs">
                    {formatDate(artigo.dataPublicacao)}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-muted-foreground font-mono text-xs">
                    {formatDate(artigo.dataModificacao)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
