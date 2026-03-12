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
  slug: string;
  nome: string;
  categoria: string | null;
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

  // Inicializa filtros a partir da URL (fallback para defaults)
  const [monthFrom, setMonthFrom] = useState(() => searchParams.get("c_mf") ?? "2025-01");
  const [monthTo, setMonthTo] = useState(() => searchParams.get("c_mt") ?? "");
  const [specialFilter, setSpecialFilter] = useState<"all" | "hide" | "only">(() => {
    const sp = searchParams.get("c_sp");
    return sp === "hide" || sp === "only" ? sp : "all";
  });
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>(() => {
    const cats = searchParams.get("c_cats");
    return cats ? cats.split(",") : [];
  });
  const [sortField, setSortField] = useState<"nome" | "instrutores" | "dataPublicacao">(() => {
    const sf = searchParams.get("c_sf");
    return sf === "nome" || sf === "instrutores" ? sf : "dataPublicacao";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("c_sd") === "asc" ? "asc" : "desc"
  );

  // Sincroniza estado → URL (merge com params das outras abas)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    monthFrom && monthFrom !== "2025-01" ? params.set("c_mf", monthFrom) : params.delete("c_mf");
    monthTo ? params.set("c_mt", monthTo) : params.delete("c_mt");
    specialFilter !== "all" ? params.set("c_sp", specialFilter) : params.delete("c_sp");
    selectedCatalogs.length > 0 ? params.set("c_cats", selectedCatalogs.join(",")) : params.delete("c_cats");
    sortField !== "dataPublicacao" ? params.set("c_sf", sortField) : params.delete("c_sf");
    sortDir !== "desc" ? params.set("c_sd", sortDir) : params.delete("c_sd");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFrom, monthTo, specialFilter, selectedCatalogs, sortField, sortDir, router, pathname]);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "dataPublicacao" ? "desc" : "asc");
    }
  }

  function isSpecial(nome: string) {
    return nome.toLowerCase().includes("em breve") || nome.toLowerCase().includes("checkpoint");
  }

  function getInstrutor(course: Course): string {
    if (course.instrutor) return course.instrutor;
    return course.instrutores.join(", ");
  }

  const availableCatalogs = useMemo(
    () => [...new Set(courses.flatMap((c) => c.catalogos))].sort(),
    [courses]
  );

  const sortedCourses = useMemo(() => {
    let filtered = courses;

    if (specialFilter === "hide") {
      filtered = filtered.filter((c) => !isSpecial(c.nome));
    } else if (specialFilter === "only") {
      filtered = filtered.filter((c) => isSpecial(c.nome));
    }

    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter((c) =>
        selectedCatalogs.some((cat) => c.catalogos.includes(cat))
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "nome") {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      } else if (sortField === "instrutores") {
        cmp = getInstrutor(a).localeCompare(getInstrutor(b), "pt-BR");
      } else if (sortField === "dataPublicacao") {
        cmp = (a.dataPublicacao ?? "").localeCompare(b.dataPublicacao ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [courses, sortField, sortDir, specialFilter, selectedCatalogs]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (monthFrom) params.set("month_from", monthFrom);
    if (monthTo) params.set("month_to", monthTo);
    const res = await fetch(`/api/publicacoes/cursos?${params}`);
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [monthFrom, monthTo]);

  useEffect(() => { load(); }, [load]);

  async function handleCopy() {
    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const html = [
      "<table>",
      "<tr><th>Nome</th><th>Categoria</th><th>Instrutor</th><th>Catálogo(s)</th><th>Publicação</th></tr>",
      ...sortedCourses.map((c) =>
        `<tr><td><a href="https://www.alura.com.br/curso-online-${c.slug}">${esc(c.nome)}</a></td><td>${esc(c.categoria ?? "")}</td><td>${esc(getInstrutor(c))}</td><td>${esc(c.catalogos.join(", "))}</td><td>${formatDate(c.dataPublicacao)}</td></tr>`
      ),
      "</table>",
    ].join("\n");
    const plain = [
      ["Nome", "Categoria", "Instrutor", "Catálogo(s)", "Publicação", "Link"].join("\t"),
      ...sortedCourses.map((c) =>
        [c.nome, c.categoria ?? "", getInstrutor(c), c.catalogos.join(", "), formatDate(c.dataPublicacao), `https://www.alura.com.br/curso-online-${c.slug}`].join("\t")
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
        {(monthFrom || monthTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonthFrom(""); setMonthTo(""); }}>
            Limpar tudo
          </Button>
        )}

        {availableCatalogs.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors",
                selectedCatalogs.length > 0
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground"
              )}>
                {selectedCatalogs.length === 0
                  ? "Catálogos"
                  : selectedCatalogs.length === 1
                  ? selectedCatalogs[0]
                  : `${selectedCatalogs.length} catálogos`}
                <ChevronDown size={12} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1" align="start">
              <button
                onClick={() => setSelectedCatalogs([])}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                  selectedCatalogs.length === 0
                    ? "font-medium text-foreground bg-muted"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center border", selectedCatalogs.length === 0 ? "bg-primary border-primary" : "border-muted-foreground")}>
                  {selectedCatalogs.length === 0 && <Check size={10} className="text-primary-foreground" />}
                </span>
                Todos
              </button>
              <div className="my-1 border-t" />
              <div className="max-h-56 overflow-y-auto">
                {availableCatalogs.map((cat) => {
                  const active = selectedCatalogs.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCatalogs((prev) =>
                          active ? prev.filter((c) => c !== cat) : [...prev, cat]
                        )
                      }
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors"
                    >
                      <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center border", active ? "bg-primary border-primary" : "border-muted-foreground")}>
                        {active && <Check size={10} className="text-primary-foreground" />}
                      </span>
                      <span className="truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
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
              {syncResult && <p className="text-xs text-muted-foreground">{syncResult}</p>}
            </>
          )}
        </div>
      </div>

      {/* Filtro de especiais */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Tipo:</span>
        {(
          [
            { key: "all", label: "Todos" },
            { key: "hide", label: "Excluir especiais" },
            { key: "only", label: "Apenas especiais" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSpecialFilter(key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              specialFilter === key
                ? "bg-secondary text-secondary-foreground border-transparent"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          {isAdmin
            ? 'Nenhum curso encontrado. Clique em "Sync Admin" para buscar os cursos da Alura.'
            : "Nenhum curso encontrado para os filtros selecionados."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {(
                  [
                    { field: "nome", label: "Nome", align: "left", cls: "pr-4" },
                    { field: "instrutores", label: "Instrutor", align: "left", cls: "px-3" },
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
                  <td className="py-2.5 pr-4">
                    <a
                      href={`https://www.alura.com.br/curso-online-${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors flex items-start gap-1.5 group"
                    >
                      {course.nome}
                      <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {course.categoria && (
                      <span className="text-xs text-muted-foreground">{course.categoria}</span>
                    )}
                    {course.catalogos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {course.catalogos.map((cat) => (
                          <span key={cat} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-mono leading-none">
                            {cat}
                          </span>
                        ))}
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
