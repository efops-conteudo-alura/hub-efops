"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CursosTab } from "./cursos-tab";
import { ArtigosTab } from "./artigos-tab";
import { TrilhasTab } from "./trilhas-tab";
import { CarreirasTab } from "./carreiras-tab";
import type { CarreiraLevel, SyncResult } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

type Tab = "cursos" | "artigos" | "trilhas" | "carreiras";

const TABS: { key: Tab; label: string }[] = [
  { key: "cursos", label: "Cursos" },
  { key: "artigos", label: "Artigos" },
  { key: "trilhas", label: "Trilhas" },
  { key: "carreiras", label: "Carreiras Alura" },
];

interface Props {
  isAdmin: boolean;
  initialLevels: CarreiraLevel[];
}

export function PublicacoesClient({ isAdmin, initialLevels }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("cursos");
  // Guarda os levels no pai para que sobrevivam à troca de aba
  const [levels, setLevels] = useState<CarreiraLevel[]>(initialLevels);

  function handleCarreirasSynced(result: SyncResult) {
    setLevels(result.levels);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="hub-page-title">Publicações</h1>
        <p className="hub-section-title">Conteúdo publicado pela Alura</p>
      </div>

      {/* Tabs */}
      <div className="flex">
        {TABS.map((tab) => (
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

      {activeTab === "cursos" && <CursosTab isAdmin={isAdmin} />}
      {activeTab === "artigos" && <ArtigosTab isAdmin={isAdmin} />}
      {activeTab === "trilhas" && <TrilhasTab isAdmin={isAdmin} />}
      {activeTab === "carreiras" && (
        <CarreirasTab initialLevels={levels} onSynced={handleCarreirasSynced} />
      )}
    </div>
  );
}
