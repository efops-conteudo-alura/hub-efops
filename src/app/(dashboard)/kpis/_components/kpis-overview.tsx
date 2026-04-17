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
import { ProducaoTable, buildProducaoTsv } from "./producao-table";
import { EdicaoTable, buildEdicaoTsv } from "./edicao-table";
import { PesosDialog } from "./pesos-dialog";
import { KpisCharts } from "./kpis-charts";
import { PublicacoesSyncDialog } from "./publicacoes-sync-dialog";
import { GastosKpisTable } from "./gastos-kpis-table";
import { SuporteTable } from "./suporte-table";
import type { KpiProducao } from "./producao-form-dialog";
import type { KpiEdicao } from "./edicao-form-dialog";
import type { KpiSuporte } from "./suporte-form-dialog";

interface GastoEntry {
  month: string;
  value: number;
  currency: string;
  exchangeRate: number | null;
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
}

type Tab = "publicacao" | "graficos";

export function KpisOverview({
  initialProducao, initialEdicao, initialSuporte, initialPesos, initialAnos, currentYear, isAdmin,
  gastosInstrutores, gastosEditores,
}: KpisOverviewProps) {
  const [producao, setProducao] = useState(initialProducao);
  const [edicao, setEdicao] = useState(initialEdicao);
  const [suporte, setSuporte] = useState(initialSuporte);
  const [pesos, setPesos] = useState(initialPesos);
  const [anos, setAnos] = useState(initialAnos);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pesosOpen, setPesosOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("publicacao");
  const [copied, setCopied] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  // Filtra dados pelo ano seleccionado
  const yearStr = String(selectedYear);
  const yearProducao = producao.filter((r) => r.month.startsWith(`${yearStr}-`));
  const yearEdicao = edicao.filter((r) => r.month.startsWith(`${yearStr}-`));
  const yearSuporte = suporte.filter((r) => r.month.startsWith(`${yearStr}-`));

  const tabs: { key: Tab; label: string }[] = [
    { key: "publicacao", label: "Publicação & Edição" },
    { key: "graficos", label: "Gráficos" },
  ];

  async function handleCopy() {
    const producaoTsv = buildProducaoTsv(yearProducao, pesos);
    const edicaoTsv = buildEdicaoTsv(yearEdicao);
    const tsv = [producaoTsv, "", edicaoTsv].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(tsv);
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="hub-page-title">KPIs Conteúdo Alura</h1>
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
                onChange={(updated) =>
                  setProducao([...producao.filter((r) => !r.month.startsWith(`${yearStr}-`)), ...updated])
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase text-muted-foreground tracking-wide">Gastos</p>
              <GastosKpisTable
                year={selectedYear}
                label="Gastos instrutores"
                data={gastosInstrutores.filter((e) => e.month.startsWith(`${yearStr}-`))}
              />
            </div>
          </div>

          {/* SEÇÃO: Pós-produção */}
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
                label="Editores externos"
                data={gastosEditores.filter((e) => e.month.startsWith(`${yearStr}-`))}
              />
            </div>
          </div>

          {/* SEÇÃO: Suporte Educacional */}
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
          </div>
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
