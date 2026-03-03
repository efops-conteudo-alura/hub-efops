"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, FileText } from "lucide-react";
import { DocCard } from "./doc-card";
import { DocUploadDialog } from "./upload-dialog";

interface Doc {
  id: string;
  title: string;
  description?: string | null;
  tags: string[];
  status: string;
  creatorName: string;
  updatedAt: string;
}

interface Props {
  docs: Doc[];
}

export function DocList({ docs }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags))).sort();

  const filtered = docs.filter((d) => {
    const matchSearch = search === "" || d.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || d.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar documentações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload size={13} className="mr-1" /> Importar .docx
          </Button>
          <Button size="sm" onClick={() => router.push("/documentacoes/nova")}>
            <Plus size={13} className="mr-1" /> Nova Documentação
          </Button>
        </div>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !activeTag
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText size={40} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">
              {docs.length === 0 ? "Nenhuma documentação criada" : "Nenhum resultado"}
            </p>
            {docs.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Clique em &ldquo;Nova Documentação&rdquo; ou importe um arquivo .docx para começar.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}

      <DocUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
