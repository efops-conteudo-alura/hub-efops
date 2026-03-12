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

type SortField = "nome" | "autor" | "dataPublicacao" | "dataModificacao";

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

  const [monthFrom, setMonthFrom] = useState(() => searchParams.get("a_mf") ?? "2025-01");
  const [monthTo, setMonthTo] = useState(() => searchParams.get("a_mt") ?? "");
  const [selectedCat, setSelectedCat] = useState(() => searchParams.get("a_cat") ?? "");
  const [sortField, setSortField] = useState<SortField>(() => {
    const sf = searchParams.get("a_sf");
    return (sf === "nome" || sf === "autor" || sf === "dataModificacao") ? sf as SortField : "dataPublicacao";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() =>
    searchParams.get("a_sd") === "asc" ? "asc" : "desc"
  );

  // Sincroniza estado → URL (merge com params das outras abas)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString());
    monthFrom && monthFrom !== "2025-01" ? params.set("a_mf", monthFrom) : params.delete("a_mf");
    monthTo ? params.set("a_mt", monthTo) : params.delete("a_mt");
    selectedCat ? params.set("a_cat", selectedCat) : params.delete("a_cat");
    sortField !== "dataPublicacao" ? params.set("a_sf", sortField) : params.delete("a_sf");
    sortDir !== "desc" ? params.set("a_sd", sortDir) : params.delete("a_sd");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (monthFrom) params.set("month_from", monthFrom);
    if (monthTo) params.set("month_to", monthTo);
    if (selectedCat) params.set("categoria", selectedCat);
    const res = await fetch(`/api/publicacoes/artigos?${params}`);
    const data = await res.json();
    setArtigos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [monthFrom, monthTo, selectedCat]);

  useEffect(() => { load(); }, [load]);

  async function handleCopy() {
    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const html = [
      "<table>",
      "<tr><th>Nome</th><th>Categoria</th><th>Autor</th><th>Publicação</th><th>Atualização</th></tr>",
      ...sorted.map((a) =>
        `<tr><td><a href="https://www.alura.com.br/artigos/${a.slug}">${esc(a.nome)}</a></td><td>${esc(a.categoria ?? "")}</td><td>${esc(a.autor ?? "")}</td><td>${formatDate(a.dataPublicacao)}</td><td>${formatDate(a.dataModificacao)}</td></tr>`
      ),
      "</table>",
    ].join("\n");
    const plain = [
      ["Nome", "Categoria", "Autor", "Publicação", "Atualização", "Link"].join("\t"),
      ...sorted.map((a) =>
        [a.nome, a.categoria ?? "", a.autor ?? "", formatDate(a.dataPublicacao), formatDate(a.dataModificacao), `https://www.alura.com.br/artigos/${a.slug}`].join("\t")
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
          <MonthPicker value={monthFrom} onChange={setMonthFrom} placeholder="Início" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <MonthPicker value={monthTo} onChange={setMonthTo} placeholder="Fim" />
        </div>
        {(monthFrom || monthTo || selectedCat) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonthFrom(""); setMonthTo(""); setSelectedCat(""); }}>
            Limpar tudo
          </Button>
        )}
        <div className="ml-auto flex items-center gap-3">
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
              {sorted.map((artigo) => (
                <tr key={artigo.id}>
                  <td className="py-2.5 pr-4">
                    <a
                      href={`https://www.alura.com.br/artigos/${artigo.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors flex items-start gap-1.5 group"
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
          <p className="text-xs text-muted-foreground mt-3">{sorted.length} artigos</p>
        </div>
      )}
    </div>
  );
}
