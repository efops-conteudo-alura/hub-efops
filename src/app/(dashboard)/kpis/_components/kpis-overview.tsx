"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProducaoTable } from "./producao-table";
import { EdicaoTable } from "./edicao-table";
import { PesosDialog } from "./pesos-dialog";
import type { KpiProducao } from "./producao-form-dialog";
import type { KpiEdicao } from "./edicao-form-dialog";

interface Pesos {
  id: string;
  curso: number;
  artigo: number;
  carreira: number;
  trilha: number;
}

interface KpisOverviewProps {
  initialProducao: KpiProducao[];
  initialEdicao: KpiEdicao[];
  initialPesos: Pesos;
}

type Tab = "producao" | "edicao";

export function KpisOverview({ initialProducao, initialEdicao, initialPesos }: KpisOverviewProps) {
  const [producao, setProducao] = useState(initialProducao);
  const [edicao, setEdicao] = useState(initialEdicao);
  const [pesos, setPesos] = useState(initialPesos);
  const [pesosOpen, setPesosOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("producao");

  const tabs: { key: Tab; label: string }[] = [
    { key: "producao", label: "Produção de Conteúdo" },
    { key: "edicao", label: "Edição" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">KPIs de Conteúdo</h1>
            <p className="text-muted-foreground text-sm">Indicadores mensais de produção e edição</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPesosOpen(true)}>
          <Settings2 size={14} className="mr-2" /> Configurar Pesos
        </Button>
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

      {activeTab === "producao" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pesos: Curso={pesos.curso} · Artigo={pesos.artigo} · Carreira={pesos.carreira} · Trilha={pesos.trilha}
          </p>
          <ProducaoTable data={producao} pesos={pesos} onChange={setProducao} />
        </div>
      )}

      {activeTab === "edicao" && (
        <EdicaoTable data={edicao} onChange={setEdicao} />
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
