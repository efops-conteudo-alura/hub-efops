"use client";

import { useState, useEffect, useRef } from "react";
import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { CursosTab } from "./_components/cursos-tab";
import { CarreirasTab } from "./_components/carreiras-tab";
import type { CarreiraLevel } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

type Tab = "cursos" | "carreiras";

const TABS: { key: Tab; label: string }[] = [
  { key: "cursos", label: "Cursos" },
  { key: "carreiras", label: "Carreiras Alura" },
];

export default function PublicacoesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("cursos");
  const [levels, setLevels] = useState<CarreiraLevel[]>([]);
  const levelsLoaded = useRef(false);
  const isAdmin = session?.user?.role === "ADMIN";

  // Carrega os níveis de carreiras ao abrir a aba pela primeira vez
  useEffect(() => {
    if (activeTab === "carreiras" && !levelsLoaded.current) {
      levelsLoaded.current = true;
      fetch("/api/kpis/carreiras/sync")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setLevels(data);
        })
        .catch(() => {});
    }
  }, [activeTab]);

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

      {activeTab === "cursos" && <CursosTab isAdmin={!!isAdmin} />}
      {activeTab === "carreiras" && <CarreirasTab initialLevels={levels} />}
    </div>
  );
}
