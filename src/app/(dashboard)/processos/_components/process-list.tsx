"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus, Search, Clock, User } from "lucide-react";

interface ProcessItem {
  id: string;
  title: string;
  description?: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  creatorName: string;
  updatedAt: string;
}

interface Props {
  processes: ProcessItem[];
  currentUserId: string;
}

export function ProcessList({ processes, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    processes.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [processes]);

  const filtered = useMemo(() => {
    return processes.filter((p) => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
      const matchTag = !activeTag || p.tags.includes(activeTag);
      return matchSearch && matchTag;
    });
  }, [processes, search, activeTag]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="hub-page-title flex items-center gap-2">
          <GitBranch size={22} className="text-muted-foreground" /> Processos & Fluxos
        </h1>
        <Button asChild size="sm">
          <Link href="/processos/novo"><Plus size={15} className="mr-1" /> Novo Processo</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <GitBranch size={40} className="opacity-30" />
          <p className="text-sm">Nenhum processo encontrado.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/processos/novo">Criar o primeiro</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} href={`/processos/${p.id}`}>
              <div className="group border rounded-xl p-4 bg-card hover:border-primary hover:shadow-sm transition-all space-y-3 h-full flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-sm leading-snug group-hover:text-foreground transition-colors line-clamp-2">
                    {p.title}
                  </h2>
                  <Badge
                    variant={p.status === "PUBLISHED" ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {p.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{p.description}</p>
                )}

                {p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t mt-auto">
                  <span className="flex items-center gap-1"><User size={11} />{p.creatorName}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{formatDate(p.updatedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
