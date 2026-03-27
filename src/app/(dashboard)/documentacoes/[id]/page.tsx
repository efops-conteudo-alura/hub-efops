import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { DocViewClient } from "../_components/doc-view-client";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
};

export default async function DocViewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await prisma.documentation.findUnique({ where: { id } });
  if (!doc) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const isCreator = doc.creatorId === session.user.id;
  const canAccess = doc.status === "PUBLISHED" || isCreator || isAdmin;

  if (!canAccess) redirect("/documentacoes");

  const canEdit = isCreator || isAdmin;

  return (
    <div className="px-8 py-6 max-w-4xl">
      <Link
        href="/documentacoes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft size={14} /> Documentações
      </Link>

      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3 flex-wrap">
          <Badge variant={doc.status === "PUBLISHED" ? "default" : "secondary"}>
            {STATUS_LABELS[doc.status] ?? doc.status}
          </Badge>
          {doc.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <h1 className="hub-page-title">{doc.title}</h1>
        {doc.description && (
          <p className="text-muted-foreground text-sm">{doc.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Por {doc.creatorName} · atualizado em{" "}
          {doc.updatedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>

      <DocViewClient docId={doc.id} content={doc.content} canEdit={canEdit} />
    </div>
  );
}
