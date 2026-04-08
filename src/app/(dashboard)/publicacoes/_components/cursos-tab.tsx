"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown, ClipboardCopy, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthPicker } from "@/app/(dashboard)/gastos/_components/month-picker";

interface Course {
  id: string;
  aluraId: number | null;
  slug: string;
  nome: string;
  categoria: string | null;
  subcategorias: string | null;
  instrutores: string[];
  instrutor: string | null;
  cargaHoraria: number | null;
  dataPublicacao: string | null;
  catalogos: string[];
  isExclusive: boolean;
  tipo: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type CatalogFilterValue = "include" | "exclude";

function parseCatalogFilters(searchParams: URLSearchParams): Record<string, CatalogFilterValue> {
  const result: Record<string, CatalogFilterValue> = {};
  const inc = searchParams.get("c_inc");
  const exc = searchParams.get("c_exc");
  if (inc) inc.split(",").filter(Boolean).forEach((c) => { result[c] = "include"; });
  if (exc) exc.split(",").filter(Boolean).forEach((c) => { result[c] = "exclude"; });
  return result;
}

function parseSubcatFilters(searchParams: URLSearchParams): Record<string, CatalogFilterValue> {
  const result: Record<string, CatalogFilterValue> = {};
  const inc = searchParams.get("s_inc");
  const exc = searchParams.get("s_exc");
  if (inc) inc.split("|").filter(Boolean).forEach((c) => { result[c] = "include"; });
  if (exc) exc.split("|").filter(Boolean).forEach((c) => { result[c] = "exclude"; });
  return result;
}

function getCourseSubcats(course: { subcategorias: string | null }): string[] {
  if (!course.subcategorias) return [];
  return course.subcategorias.split(",").map((s) => s.trim()).filter(Boolean);
}

export function CursosTab({ isAdmin }: { isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  useEffect(() => { searchParamsRef.current = searchParams; }, [searchParams]);
  const router = useRouter();
  const pathname = usePathname();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const [monthFrom, setMonthFrom] = useState(() => searchParams.get("c_mf") ?? "");
  const [monthTo, setMonthTo] = useState(() => searchParams.get("c_mt") ?? "");
  const [showEmBreve, setShowEmBreve] = useState(() => searchParams.get("c_eb") !== "0");
  const [showCheckpoint, setShowCheckpoint] = useState(() => searchParams.get("c_cp") !== "0");
  const [catalogFilters, setCatalogFilters] = useState<Record<string, CatalogFilterValue>>(() => {
    const fromUrl = parseCatalogFilters(searchParams);
    // Se não há nenhum filtro de catálogo na URL, aplica o default "alura: é"
    if (!searchParams.get("c_inc") && !searchParams.get("c_exc")) {
      return { alura: "include" };
    }
    return fromUrl;
  });
  const [subcatFilters, setSubcatFilters] = useState<Record<string, CatalogFilterValue>>(
    () => parseSubcatFilters(searchParams)
  );
  const [filterSemSubcat, setFilterSemSubcat] = useState<CatalogFilterValue | null>(() => {
    const v = searchParams.get("s_none");
    return v === "include" || v === "exclude" ? v : null;
  });
  const [sortField, setSortField] = useState<"aluraId" | "nome" | "instrutores" | "dataPublicacao">(() => {
    const sf = searchParams.get("c_sf");
    return sf === "nome" || sf === "instrutores" || sf === "aluraId" ? sf : "dataPublicacao";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("c_sd") === "asc" ? "asc" : "desc"
  );

  // Sincroniza estado → URL
  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    monthFrom ? params.set("c_mf", monthFrom) : params.delete("c_mf");
    monthTo ? params.set("c_mt", monthTo) : params.delete("c_mt");
    showEmBreve ? params.delete("c_eb") : params.set("c_eb", "0");
    showCheckpoint ? params.delete("c_cp") : params.set("c_cp", "0");
    params.delete("c_sp"); // limpa param legado
    sortField !== "dataPublicacao" ? params.set("c_sf", sortField) : params.delete("c_sf");
    sortDir !== "desc" ? params.set("c_sd", sortDir) : params.delete("c_sd");

    const includes = Object.entries(catalogFilters).filter(([, v]) => v === "include").map(([k]) => k);
    const excludes = Object.entries(catalogFilters).filter(([, v]) => v === "exclude").map(([k]) => k);
    includes.length > 0 ? params.set("c_inc", includes.join(",")) : params.delete("c_inc");
    excludes.length > 0 ? params.set("c_exc", excludes.join(",")) : params.delete("c_exc");
    params.delete("c_cats"); // limpa param legado

    const sincInc = Object.entries(subcatFilters).filter(([, v]) => v === "include").map(([k]) => k);
    const sincExc = Object.entries(subcatFilters).filter(([, v]) => v === "exclude").map(([k]) => k);
    sincInc.length > 0 ? params.set("s_inc", sincInc.join("|")) : params.delete("s_inc");
    sincExc.length > 0 ? params.set("s_exc", sincExc.join("|")) : params.delete("s_exc");
    filterSemSubcat ? params.set("s_none", filterSemSubcat) : params.delete("s_none");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFrom, monthTo, showEmBreve, showCheckpoint, catalogFilters, subcatFilters, filterSemSubcat, sortField, sortDir, router, pathname]);

  function toggleCatalogFilter(cat: string, value: CatalogFilterValue) {
    setCatalogFilters((prev) => {
      const next = { ...prev };
      if (next[cat] === value) {
        delete next[cat];
      } else {
        next[cat] = value;
      }
      return next;
    });
  }

  function toggleSubcatFilter(cat: string, value: CatalogFilterValue) {
    setSubcatFilters((prev) => {
      const next = { ...prev };
      if (next[cat] === value) {
        delete next[cat];
      } else {
        next[cat] = value;
      }
      return next;
    });
  }

  function toggleSemSubcat(value: CatalogFilterValue) {
    setFilterSemSubcat((prev) => (prev === value ? null : value));
  }

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "dataPublicacao" ? "desc" : "asc");
    }
  }


  function getInstrutor(course: Course): string {
    if (course.instrutor) return course.instrutor;
    return course.instrutores.join(", ");
  }

  const availableCatalogs = useMemo(
    () => [...new Set(courses.flatMap((c) => c.catalogos))].sort(),
    [courses]
  );

  const availableSubcats = useMemo(
    () => [...new Set(courses.flatMap((c) => getCourseSubcats(c)))].sort(),
    [courses]
  );

  const activeCatalogFilters = useMemo(
    () => Object.entries(catalogFilters).filter(([cat]) => availableCatalogs.includes(cat)),
    [catalogFilters, availableCatalogs]
  );

  const catalogTriggerLabel = useMemo(() => {
    if (activeCatalogFilters.length === 0) return "Catálogos";
    if (activeCatalogFilters.length <= 2) {
      return activeCatalogFilters
        .map(([k, v]) => `${k}: ${v === "include" ? "é" : "não é"}`)
        .join(" · ");
    }
    return `${activeCatalogFilters.length} filtros`;
  }, [activeCatalogFilters]);

  const activeSubcatFilters = useMemo(
    () => Object.entries(subcatFilters).filter(([cat]) => availableSubcats.includes(cat)),
    [subcatFilters, availableSubcats]
  );

  const subcatTriggerLabel = useMemo(() => {
    const total = activeSubcatFilters.length + (filterSemSubcat ? 1 : 0);
    if (total === 0) return "Subcategorias";
    if (total <= 2) {
      const parts = activeSubcatFilters.map(([k, v]) => `${k}: ${v === "include" ? "é" : "não é"}`);
      if (filterSemSubcat) parts.push(`sem subcat: ${filterSemSubcat === "include" ? "é" : "não é"}`);
      return parts.join(" · ");
    }
    return `${total} filtros`;
  }, [activeSubcatFilters, filterSemSubcat]);

  const hasSubcatFilters = activeSubcatFilters.length > 0 || filterSemSubcat !== null;

  const hasFilters = !!(monthFrom || monthTo || !showEmBreve || !showCheckpoint || activeCatalogFilters.length > 0 || hasSubcatFilters);

  const sortedCourses = useMemo(() => {
    let filtered = courses;

    if (!showEmBreve) {
      filtered = filtered.filter((c) => !c.nome.toLowerCase().includes("em breve"));
    }
    if (!showCheckpoint) {
      filtered = filtered.filter((c) => !c.nome.toLowerCase().includes("checkpoint"));
    }

    const includes = activeCatalogFilters.filter(([, v]) => v === "include").map(([k]) => k);
    const excludes = activeCatalogFilters.filter(([, v]) => v === "exclude").map(([k]) => k);

    if (includes.length > 0) {
      filtered = filtered.filter((c) => includes.some((cat) => c.catalogos.includes(cat)));
    }
    if (excludes.length > 0) {
      filtered = filtered.filter((c) => !excludes.some((cat) => c.catalogos.includes(cat)));
    }

    const subcatIncludes = activeSubcatFilters.filter(([, v]) => v === "include").map(([k]) => k);
    const subcatExcludes = activeSubcatFilters.filter(([, v]) => v === "exclude").map(([k]) => k);

    if (filterSemSubcat === "include") {
      filtered = filtered.filter((c) => getCourseSubcats(c).length === 0);
    } else if (filterSemSubcat === "exclude") {
      filtered = filtered.filter((c) => getCourseSubcats(c).length > 0);
    }
    if (subcatIncludes.length > 0) {
      filtered = filtered.filter((c) => subcatIncludes.some((s) => getCourseSubcats(c).includes(s)));
    }
    if (subcatExcludes.length > 0) {
      filtered = filtered.filter((c) => !subcatExcludes.some((s) => getCourseSubcats(c).includes(s)));
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "aluraId") {
        cmp = (a.aluraId ?? 0) - (b.aluraId ?? 0);
      } else if (sortField === "nome") {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      } else if (sortField === "instrutores") {
        cmp = getInstrutor(a).localeCompare(getInstrutor(b), "pt-BR");
      } else if (sortField === "dataPublicacao") {
        cmp = (a.dataPublicacao ?? "").localeCompare(b.dataPublicacao ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [courses, sortField, sortDir, showEmBreve, showCheckpoint, activeCatalogFilters, activeSubcatFilters, filterSemSubcat]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (monthFrom) params.set("month_from", monthFrom);
      if (monthTo) params.set("month_to", monthTo);
      const res = await fetch(`/api/publicacoes/cursos?${params}`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [monthFrom, monthTo]);

  useEffect(() => { load(); }, [load]);

  async function handleCopy() {
    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const html = [
      "<table>",
      "<tr><th>ID</th><th>Nome</th><th>Categoria</th><th>Instrutor</th><th>Catálogo(s)</th><th>Publicação</th></tr>",
      ...sortedCourses.map((c) =>
        `<tr><td>${c.aluraId ?? ""}</td><td><a href="https://www.alura.com.br/curso-online-${c.slug}">${esc(c.nome)}</a></td><td>${esc(c.categoria ?? "")}</td><td>${esc(getInstrutor(c))}</td><td>${esc(c.catalogos.join(", "))}</td><td>${formatDate(c.dataPublicacao)}</td></tr>`
      ),
      "</table>",
    ].join("\n");
    const plain = [
      ["ID", "Nome", "Categoria", "Instrutor", "Catálogo(s)", "Publicação", "Link"].join("\t"),
      ...sortedCourses.map((c) =>
        [c.aluraId ?? "", c.nome, c.categoria ?? "", getInstrutor(c), c.catalogos.join(", "), formatDate(c.dataPublicacao), `https://www.alura.com.br/curso-online-${c.slug}`].join("\t")
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
      const res = await fetch("/api/publicacoes/sync-admin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Erro ao sincronizar");
        return;
      }
      setSyncResult(
        `${data.created} novos · ${data.updated} atualizados · ${data.total} total`
      );
      load();
    } catch {
      setSyncResult("Erro de conexão");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filtros de data + catálogo + botões */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <MonthPicker value={monthFrom} onChange={setMonthFrom} placeholder="Início" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <MonthPicker value={monthTo} onChange={setMonthTo} placeholder="Fim" />
        </div>

        {availableCatalogs.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
                activeCatalogFilters.length > 0
                  ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground"
              )}>
                <span className="max-w-[200px] truncate">{catalogTriggerLabel}</span>
                <ChevronDown size={12} className="shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-medium text-muted-foreground">Filtrar por catálogo</p>
              </div>
              <div className="px-2 py-1.5">
                {/* Header das colunas */}
                <div className="flex items-center px-2 pb-1">
                  <span className="flex-1 text-[10px] text-muted-foreground/60 uppercase tracking-wide">Catálogo</span>
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide">É</span>
                    <span className="w-14 text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide">Não é</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {availableCatalogs.map((cat) => {
                    const current = catalogFilters[cat];
                    return (
                      <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors group">
                        <span className="flex-1 text-xs truncate text-foreground">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleCatalogFilter(cat, "include")}
                            className={cn(
                              "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                              current === "include"
                                ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                                : "bg-transparent text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            )}
                          >
                            É
                          </button>
                          <button
                            onClick={() => toggleCatalogFilter(cat, "exclude")}
                            className={cn(
                              "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                              current === "exclude"
                                ? "bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600"
                                : "bg-transparent text-muted-foreground border-border hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400"
                            )}
                          >
                            Não é
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {activeCatalogFilters.length > 0 && (
                <div className="px-3 py-2 border-t">
                  <button
                    onClick={() => setCatalogFilters({})}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpar filtros de catálogo
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {availableSubcats.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
                hasSubcatFilters
                  ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground"
              )}>
                <span className="max-w-[200px] truncate">{subcatTriggerLabel}</span>
                <ChevronDown size={12} className="shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-medium text-muted-foreground">Filtrar por subcategoria</p>
              </div>
              <div className="px-2 py-1.5">
                <div className="flex items-center px-2 pb-1">
                  <span className="flex-1 text-[10px] text-muted-foreground/60 uppercase tracking-wide">Subcategoria</span>
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide">É</span>
                    <span className="w-14 text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide">Não é</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {/* Opção especial: sem subcategoria */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
                    <span className="flex-1 text-xs truncate text-muted-foreground italic">sem subcategoria</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleSemSubcat("include")}
                        className={cn(
                          "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                          filterSemSubcat === "include"
                            ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                            : "bg-transparent text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        )}
                      >
                        É
                      </button>
                      <button
                        onClick={() => toggleSemSubcat("exclude")}
                        className={cn(
                          "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                          filterSemSubcat === "exclude"
                            ? "bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600"
                            : "bg-transparent text-muted-foreground border-border hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400"
                        )}
                      >
                        Não é
                      </button>
                    </div>
                  </div>
                  {availableSubcats.map((cat) => {
                    const current = subcatFilters[cat];
                    return (
                      <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors">
                        <span className="flex-1 text-xs truncate text-foreground">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleSubcatFilter(cat, "include")}
                            className={cn(
                              "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                              current === "include"
                                ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600"
                                : "bg-transparent text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            )}
                          >
                            É
                          </button>
                          <button
                            onClick={() => toggleSubcatFilter(cat, "exclude")}
                            className={cn(
                              "w-14 py-0.5 rounded text-[10px] font-medium border transition-all",
                              current === "exclude"
                                ? "bg-rose-500 text-white border-rose-500 dark:bg-rose-600 dark:border-rose-600"
                                : "bg-transparent text-muted-foreground border-border hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-400"
                            )}
                          >
                            Não é
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {hasSubcatFilters && (
                <div className="px-3 py-2 border-t">
                  <button
                    onClick={() => { setSubcatFilters({}); setFilterSemSubcat(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpar filtros de subcategoria
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => {
            setMonthFrom("");
            setMonthTo("");
            setShowEmBreve(true);
            setShowCheckpoint(true);
            setCatalogFilters({});
            setSubcatFilters({});
            setFilterSemSubcat(null);
          }}>
            Limpar tudo
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {sortedCourses.length > 0 && !loading && (
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check size={14} className="mr-2 text-green-500" /> : <ClipboardCopy size={14} className="mr-2" />}
              {copied ? "Copiado!" : "Copiar dados"}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={14} className={cn("mr-2", syncing && "animate-spin")} />
                {syncing ? "Sincronizando..." : "Sync BI"}
              </Button>
              <div className="flex flex-col items-end gap-0.5">
                <a
                  href="https://bi.caelumalura.com.br/query?id=2722"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  title="Abrir query no Caelum BI"
                >
                  <ExternalLink size={13} />
                  Caelum BI
                </a>
                {syncResult && <p className="text-[10px] text-muted-foreground/70">{syncResult}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filtro de especiais */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Ocultar:</span>
        <button
          onClick={() => setShowEmBreve((v) => !v)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            !showEmBreve
              ? "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          )}
        >
          {showEmBreve ? "Em breve: visível" : "Em breve: oculto"}
        </button>
        <button
          onClick={() => setShowCheckpoint((v) => !v)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            !showCheckpoint
              ? "bg-purple-100 text-purple-800 border-transparent dark:bg-purple-900/40 dark:text-purple-300"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          )}
        >
          {showCheckpoint ? "Checkpoints: visível" : "Checkpoints: oculto"}
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          {isAdmin
            ? 'Nenhum curso encontrado. Clique em "Sync BI" para buscar os cursos da Alura.'
            : "Nenhum curso encontrado para os filtros selecionados."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 pr-4 w-16">
                  <button
                    onClick={() => handleSort("aluraId")}
                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ID
                    {sortField === "aluraId" ? (
                      sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                </th>
                {(
                  [
                    { field: "nome", label: "Nome", cls: "pr-4" },
                    { field: "instrutores", label: "Instrutor", cls: "px-3" },
                  ] as const
                ).map(({ field, label, cls }) => (
                  <th key={field} className={`text-left pb-2 ${cls}`}>
                    <button
                      onClick={() => handleSort(field)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                      {sortField === field ? (
                        sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="text-right pb-2 px-3">
                  <button
                    onClick={() => handleSort("dataPublicacao")}
                    className="flex items-center justify-end gap-1 w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Publicação
                    {sortField === "dataPublicacao" ? (
                      sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-40" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedCourses.map((course) => (
                <tr key={course.id}>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs tabular-nums">
                    {course.aluraId ?? "—"}
                  </td>
                  <td className="py-2.5 pr-4">
                    <a
                      href={`https://www.alura.com.br/curso-online-${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-foreground transition-colors flex items-start gap-1.5 group"
                    >
                      {course.nome}
                      <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    <div className="flex flex-col gap-0">
                      {course.categoria && (
                        <span className="text-xs text-muted-foreground">{course.categoria}</span>
                      )}
                      {course.subcategorias && (
                        <span className="text-xs italic text-muted-foreground/50">{course.subcategorias}</span>
                      )}
                    </div>
                    {(course.catalogos.length > 0 || course.nome.toLowerCase().includes("em breve") || course.nome.toLowerCase().includes("checkpoint")) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {course.catalogos.map((cat) => (
                          <span key={cat} className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono leading-none",
                            cat === "alura"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {cat}
                          </span>
                        ))}
                        {course.nome.toLowerCase().includes("em breve") && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            em breve
                          </span>
                        )}
                        {course.nome.toLowerCase().includes("checkpoint") && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono leading-none bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                            checkpoint
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {getInstrutor(course) || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground font-mono text-xs">
                    {formatDate(course.dataPublicacao)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">{sortedCourses.length} cursos</p>
        </div>
      )}
    </div>
  );
}
