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
import type { KpiProducao } from "./producao-form-dialog";
import type { KpiEdicao } from "./edicao-form-dialog";

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
  initialPesos: Pesos;
  initialAnos: KpiAno[];
  currentYear: number;
  isAdmin: boolean;
}

type Tab = "publicacao" | "graficos";

export function KpisOverview({
  initialProducao, initialEdicao, initialPesos, initialAnos, currentYear, isAdmin,
}: KpisOverviewProps) {
  const [producao, setProducao] = useState(initialProducao);
  const [edicao, setEdicao] = useState(initialEdicao);
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">KPIs de Conteúdo</h1>
            <p className="text-muted-foreground text-sm">Indicadores mensais de publicação e edição</p>
          </div>
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
      <div className="border-b flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "publicacao" && (
        <div className="space-y-8">
          <div className="space-y-1">
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
          <EdicaoTable
            year={selectedYear}
            data={yearEdicao}
            isAdmin={isAdmin}
            onChange={(updated) =>
              setEdicao([...edicao.filter((r) => !r.month.startsWith(`${yearStr}-`)), ...updated])
            }
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
