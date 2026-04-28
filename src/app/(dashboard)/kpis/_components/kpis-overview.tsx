"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Settings2, ClipboardCopy, Check, ChevronDown, Plus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ProducaoTable, fmtMonthShort, calcScoreProducao } from "./producao-table";
import { EdicaoTable, totalEntregas, calcScoreEdicao } from "./edicao-table";
import { SuporteTable } from "./suporte-table";
import { PesosDialog } from "./pesos-dialog";
import { KpisCharts } from "./kpis-charts";
import { PublicacoesSyncDialog } from "./publicacoes-sync-dialog";
import { GastosKpisTable } from "./gastos-kpis-table";
import { LeadtimeClickupPanel, type LeadtimeTaskRow } from "./leadtime-clickup-panel";
import type { KpiProducao } from "./producao-form-dialog";
import type { KpiEdicao } from "./edicao-form-dialog";
import type { KpiSuporte } from "./suporte-form-dialog";
import type { KpiLeadtime } from "./leadtime-form-dialog";

interface GastoEntry {
  month: string;
  value: number;
  currency: string;
  exchangeRate: number | null;
  costCenter: string;
}

interface Pesos {
  id: string;
  curso: number;
  artigo: number;
  carreira: number;
  nivel: number;
  trilha: number;
}

interface KpiAno {
  id: string;
  year: number;
}

interface KpisOverviewProps {
  initialProducao: KpiProducao[];
  initialEdicao: KpiEdicao[];
  initialSuporte: KpiSuporte[];
  initialPesos: Pesos;
  initialAnos: KpiAno[];
  currentYear: number;
  isAdmin: boolean;
  gastosInstrutores: GastoEntry[];
  gastosEditores: GastoEntry[];
  gastosSuporte: GastoEntry[];
  initialLeadtime: KpiLeadtime[];
  initialLeadtimeTasks: LeadtimeTaskRow[];
}

type Tab = "publicacao" | "leadtime" | "graficos";

export function KpisOverview({
  initialProducao, initialEdicao, initialSuporte, initialLeadtime, initialPesos, initialAnos, currentYear, isAdmin,
  gastosInstrutores, gastosEditores, gastosSuporte,
  initialLeadtimeTasks,
}: KpisOverviewProps) {
  const [producao, setProducao] = useState(initialProducao);
  const [edicao, setEdicao] = useState(initialEdicao);
  const [suporte, setSuporte] = useState(initialSuporte);
  const [leadtime] = useState(initialLeadtime);
  const [costCenter, setCostCenter] = useState<"ALURA" | "LATAM" | null>(null);
  const [pesos, setPesos] = useState(initialPesos);
  const [anos, setAnos] = useState(initialAnos);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pesosOpen, setPesosOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("publicacao");
  const [copied, setCopied] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  const yearStr = String(selectedYear);
  // Producao é filtrada pelo ano E pelo costCenter ativo (LATAM → só LATAM; resto → só ALURA)
  const yearProducao = producao.filter((r) => {
    if (!r.month.startsWith(`${yearStr}-`)) return false;
    return r.costCenter === (costCenter === "LATAM" ? "LATAM" : "ALURA");
  });
  const yearEdicao = edicao.filter((r) => r.month.startsWith(`${yearStr}-`));
  const yearSuporte = suporte.filter((r) => r.month.startsWith(`${yearStr}-`));

  const h1Title = costCenter === "ALURA" ? "KPIs Conteúdo · Alura" : costCenter === "LATAM" ? "KPIs Conteúdo · Latam" : "KPIs Conteúdo";

  const costCenterFilters: { label: string; value: "ALURA" | "LATAM" | null }[] = [
    { label: "Alura", value: "ALURA" },
    { label: "Latam", value: "LATAM" },
    { label: "Ambos", value: null },
  ];

  const filterGastos = (entries: GastoEntry[]) =>
    costCenter ? entries.filter((e) => e.costCenter === costCenter) : entries;

  const gastoLabel = (base: string) =>
    costCenter === "ALURA" ? `${base} · Alura` : costCenter === "LATAM" ? `${base} · LATAM` : base;

  const tabs: { key: Tab; label: string }[] = [
    { key: "publicacao", label: "Indicadores" },
    { key: "leadtime", label: "Leadtimes" },
    { key: "graficos", label: "Gráficos" },
  ];

  async function handleCopy() {
    const producaoLabel = costCenter === "LATAM"
      ? "Publicação de Conteúdo · Latam"
      : "Publicação de Conteúdo · Alura";

    // Funções auxiliares locais
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pct = (p: number, t: number) => t === 0 ? "—" : `${((p / t) * 100).toFixed(1)}%`;
    const fmtSla = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    // Cada "seção" é um array de linhas; cada linha tem células + flags de formatação
    type Row = { cells: string[]; bold?: boolean; monthHeader?: boolean };
    const sections: Row[][] = [];

    // ---- Publicação ----
    const sortedProd = [...yearProducao].sort((a, b) => a.month.localeCompare(b.month));
    if (sortedProd.length > 0) {
      const scores = sortedProd.map((r) => calcScoreProducao(r, pesos));
      const months = sortedProd.map((r) => fmtMonthShort(r.month));
      const mm3 = (i: number) =>
        i < 2 ? "—" : String(Math.round((scores[i - 2] + scores[i - 1] + scores[i]) / 3));
      sections.push([
        { cells: [producaoLabel],                           bold: true },
        { cells: ["Entregas", ...months],                   bold: true, monthHeader: true },
        { cells: ["# Cursos",    ...sortedProd.map((r) => String(r.cursos))] },
        { cells: ["# Artigos",   ...sortedProd.map((r) => String(r.artigos))] },
        { cells: ["# Carreiras", ...sortedProd.map((r) => String(r.carreiras))] },
        { cells: ["# Níveis",    ...sortedProd.map((r) => String(r.niveis))] },
        { cells: ["# Trilhas",   ...sortedProd.map((r) => String(r.trilhas))] },
        { cells: ["Score do mês", ...scores.map(String)] },
        { cells: ["MM 3 meses",   ...sortedProd.map((_, i) => mm3(i))] },
      ]);
    }

    // ---- Pós-produção (apenas Alura/Ambos) ----
    if (costCenter !== "LATAM") {
      const sortedEd = [...yearEdicao].sort((a, b) => a.month.localeCompare(b.month));
      if (sortedEd.length > 0) {
        const months = sortedEd.map((r) => fmtMonthShort(r.month));
        sections.push([
          { cells: ["Pós-produção"],                          bold: true },
          { cells: ["Entregas", ...months],                   bold: true, monthHeader: true },
          { cells: ["Entregas",    ...sortedEd.map((r) => String(totalEntregas(r)))] },
          { cells: ["Correções",   ...sortedEd.map((r) => String(r.correcoes))] },
          { cells: ["Score Edição",...sortedEd.map((r) => String(calcScoreEdicao(r)))] },
          { cells: ["Distribuição de Entregas", ...months],   bold: true, monthHeader: true },
          { cells: ["Entregas Conteúdo",  ...sortedEd.map((r) => pct(r.entregasConteudo,  totalEntregas(r)))] },
          { cells: ["Entregas Start",     ...sortedEd.map((r) => pct(r.entregasStart,     totalEntregas(r)))] },
          { cells: ["Entregas Latam",     ...sortedEd.map((r) => pct(r.entregasLatam,     totalEntregas(r)))] },
          { cells: ["Entregas Marketing", ...sortedEd.map((r) => pct(r.entregasMarketing, totalEntregas(r)))] },
          { cells: ["Outras (PM3, B2B, DHO…)", ...sortedEd.map((r) => pct(r.entregasOutras, totalEntregas(r)))] },
        ]);
      }

      // ---- Suporte Educacional ----
      const sortedSup = [...yearSuporte].sort((a, b) => a.month.localeCompare(b.month));
      if (sortedSup.length > 0) {
        const months = sortedSup.map((r) => fmtMonthShort(r.month));
        sections.push([
          { cells: ["Suporte Educacional"],   bold: true },
          { cells: ["Entregas", ...months],   bold: true, monthHeader: true },
          { cells: ["Tópicos respondidos", ...sortedSup.map((r) => String(r.topicosRespondidos))] },
          { cells: ["SLA médio (h)",        ...sortedSup.map((r) => fmtSla(r.slaMedio))] },
          { cells: ["Artigos criados",      ...sortedSup.map((r) => String(r.artigosCriados))] },
          { cells: ["Artigos revisados",    ...sortedSup.map((r) => String(r.artigosRevisados))] },
          { cells: ["Imersões",             ...sortedSup.map((r) => String(r.imersoes))] },
        ]);
      }
    }

    if (sections.length === 0) return;

    // TSV (fallback texto puro)
    const tsv = sections
      .map((rows) => rows.map((r) => r.cells.join("\t")).join("\n"))
      .join("\n\n");

    // HTML — bold nos cabeçalhos + mso-number-format:'@' nas células de mês
    // impede o Google Sheets de converter "jan/26" em número de série de data
    const htmlRows = sections.flatMap((rows, si) => {
      const spacer = si > 0 ? ["<tr><td></td></tr>"] : [];
      const dataRows = rows.map((row) => {
        const tds = row.cells.map((cell, ci) => {
          const isMonthCell = row.monthHeader && ci > 0;
          const style = isMonthCell ? " style=\"mso-number-format:'@'\"" : "";
          const inner = row.bold ? `<b>${esc(cell)}</b>` : esc(cell);
          return `<td${style}>${inner}</td>`;
        });
        return `<tr>${tds.join("")}</tr>`;
      });
      return [...spacer, ...dataRows];
    });
    const html = `<table>${htmlRows.join("")}</table>`;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([tsv], { type: "text/plain" }),
          "text/html":  new Blob([html], { type: "text/html" }),
        }),
      ]);
    } catch {
      // Fallback para browsers que não suportam ClipboardItem
      await navigator.clipboard.writeText(tsv);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Sugere anos para adicionar (±5 do actual, excluindo os que já existem)
  const existingYears = new Set(anos.map((a) => a.year));
  const suggestedYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).filter(
    (y) => !existingYears.has(y)
  );

  async function handleRefreshProducao() {
    const res = await fetch("/api/kpis/producao");
    if (res.ok) {
      const data = await res.json();
      setProducao(data);
    }
  }

  async function handleAddYear(year: number) {
    setAddingYear(true);
    const res = await fetch("/api/kpis/anos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    if (res.ok) {
      const novo = await res.json();
      setAnos((prev) => [...prev, novo].sort((a, b) => b.year - a.year));
      setSelectedYear(year);
    }
    setAddingYear(false);
  }

  const sortedAnos = [...anos].sort((a, b) => b.year - a.year);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Filtro Alura / LATAM / Ambos */}
      <div className="flex items-center gap-2">
        {costCenterFilters.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setCostCenter(f.value)}
            className={cn(
              "px-3 py-1 text-xs font-mono font-semibold uppercase rounded border transition-colors",
              costCenter === f.value
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="hub-page-title">{h1Title}</h1>
          <p className="hub-section-title">Indicadores mensais de publicação e edição</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dropdown de ano */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedYear}
                <ChevronDown size={13} className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {sortedAnos.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => setSelectedYear(a.year)}
                  className={cn(a.year === selectedYear && "font-semibold")}
                >
                  {a.year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Adicionar ano — apenas admin */}
          {isAdmin && suggestedYears.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={addingYear}>
                  <Plus size={13} className="mr-1" /> Ano
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {suggestedYears.map((y) => (
                  <DropdownMenuItem key={y} onClick={() => handleAddYear(y)}>
                    {y}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {activeTab === "publicacao" && (
            <>
              {isAdmin && (
                <PublicacoesSyncDialog
                  anos={anos}
                  producao={producao}
                  onSuccess={handleRefreshProducao}
                />
              )}
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check size={14} className="mr-2 text-green-500" /> : <ClipboardCopy size={14} className="mr-2" />}
                {copied ? "Copiado!" : "Copiar dados"}
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setPesosOpen(true)}>
                  <Settings2 size={14} className="mr-2" /> Pesos
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative",
              activeTab === tab.key
                ? "bg-card text-foreground border-t-foreground z-10"
                : "bg-sidebar text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "publicacao" && (
        <div className="space-y-10">
          {/* SEÇÃO: Conteúdo */}
          <div className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-[var(--font-encode-sans)] font-light">Conteúdo</h2>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Publicações</p>
              <p className="text-xs text-muted-foreground">
                Pesos: Curso={pesos.curso} · Artigo={pesos.artigo} · Carreira={pesos.carreira} · Nível={pesos.nivel} · Trilha={pesos.trilha}
              </p>
              <ProducaoTable
                year={selectedYear}
                data={yearProducao}
                pesos={pesos}
                isAdmin={isAdmin}
                costCenter={costCenter ?? "ALURA"}
                onChange={(updated) => {
                  const cc = costCenter === "LATAM" ? "LATAM" : "ALURA";
                  setProducao([
                    ...producao.filter((r) => !(r.month.startsWith(`${yearStr}-`) && r.costCenter === cc)),
                    ...updated,
                  ]);
                }}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Gastos</p>
              <GastosKpisTable
                year={selectedYear}
                label={gastoLabel("Gastos instrutores")}
                data={filterGastos(gastosInstrutores).filter((e) => e.month.startsWith(`${yearStr}-`))}
              />
            </div>
          </div>

          {/* SEÇÃO: Pós-produção — apenas Alura/Ambos */}
          {costCenter !== "LATAM" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-2xl font-[var(--font-encode-sans)] font-light">Pós-produção</h2>
              </div>

              <EdicaoTable
                year={selectedYear}
                data={yearEdicao}
                isAdmin={isAdmin}
                onChange={(updated) =>
                  setEdicao([...edicao.filter((r) => !r.month.startsWith(`${yearStr}-`)), ...updated])
                }
              />

              <div className="space-y-2">
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Gastos</p>
                <GastosKpisTable
                  year={selectedYear}
                  label={gastoLabel("Editores externos")}
                  data={filterGastos(gastosEditores).filter((e) => e.month.startsWith(`${yearStr}-`))}
                />
              </div>
            </div>
          )}

          {/* SEÇÃO: Suporte Educacional — apenas Alura/Ambos */}
          {costCenter !== "LATAM" && (
            <div className="space-y-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-2xl font-[var(--font-encode-sans)] font-light">Suporte Educacional</h2>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Entregas</p>
                <SuporteTable
                  year={selectedYear}
                  data={yearSuporte}
                  isAdmin={isAdmin}
                  onChange={(updated) =>
                    setSuporte([...suporte.filter((r) => !r.month.startsWith(`${yearStr}-`)), ...updated])
                  }
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Gastos</p>
                <GastosKpisTable
                  year={selectedYear}
                  label={gastoLabel("Suporte educacional")}
                  data={filterGastos(gastosSuporte).filter((e) => e.month.startsWith(`${yearStr}-`))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "leadtime" && (
        <div className="space-y-6">
          {costCenter !== null && (
            <div className="border-b border-border pb-3">
              <h2 className="text-2xl font-[var(--font-encode-sans)] font-light">
                {costCenter === "ALURA" ? "Conteúdo" : "Latam"}
              </h2>
            </div>
          )}

          <LeadtimeClickupPanel
            costCenter={costCenter}
            year={selectedYear}
            initialData={initialLeadtimeTasks}
            initialManualData={leadtime}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {activeTab === "graficos" && (
        <KpisCharts producao={producao} edicao={edicao} pesos={pesos} />
      )}

      <PesosDialog
        open={pesosOpen}
        onOpenChange={setPesosOpen}
        pesos={pesos}
        onSaved={setPesos}
      />
    </div>
  );
}
