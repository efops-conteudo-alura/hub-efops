"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock } from "lucide-react";

interface DocCardProps {
  doc: {
    id: string;
    title: string;
    description?: string | null;
    tags: string[];
    status: string;
    creatorName: string;
    updatedAt: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? "es" : ""}`;
  return `há ${Math.floor(months / 12)} ano${Math.floor(months / 12) > 1 ? "s" : ""}`;
}

export function DocCard({ doc }: DocCardProps) {
  return (
    <Link
      href={`/documentacoes/${doc.id}`}
      className="block rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-muted-foreground shrink-0 mt-0.5" />
          <p className="font-semibold text-sm leading-tight line-clamp-2">{doc.title}</p>
        </div>
        <Badge
          variant={doc.status === "PUBLISHED" ? "default" : "secondary"}
          className="text-xs shrink-0"
        >
          {STATUS_LABELS[doc.status] ?? doc.status}
        </Badge>
      </div>

      {doc.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
          {doc.description}
        </p>
      )}

      {doc.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {doc.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {doc.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">+{doc.tags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock size={11} />
        <span>{timeAgo(doc.updatedAt)} · {doc.creatorName}</span>
      </div>
    </Link>
  );
}
