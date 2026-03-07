"use client";

import { useState } from "react";
import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { CursosTab } from "./cursos-tab";
import { CarreirasTab } from "./carreiras-tab";
import type { CarreiraLevel, SyncResult } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

type Tab = "cursos" | "carreiras";

const TABS: { key: Tab; label: string }[] = [
  { key: "cursos", label: "Cursos" },
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BookMarked size={26} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Publicações</h1>
          <p className="text-muted-foreground text-sm">Conteúdo publicado pela Alura</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {TABS.map((tab) => (
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

      {activeTab === "cursos" && <CursosTab isAdmin={isAdmin} />}
      {activeTab === "carreiras" && (
        <CarreirasTab initialLevels={levels} onSynced={handleCarreirasSynced} />
      )}
    </div>
  );
}
