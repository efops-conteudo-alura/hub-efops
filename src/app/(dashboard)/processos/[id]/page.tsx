import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Pencil, User } from "lucide-react";
import { ProcessViewClient } from "./_view-client";

export default async function ProcessoViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const process = await prisma.process.findUnique({ where: { id } });
  if (!process) notFound();

  const canEdit =
    session.user.id === process.creatorId || session.user.role === "ADMIN";

  if (process.status === "DRAFT" && !canEdit) {
    redirect("/processos");
  }

  const updatedAt = new Date(process.updatedAt).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-card flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/processos"><ArrowLeft size={16} className="mr-1" /> Voltar</Link>
        </Button>
        <h1 className="text-lg font-semibold flex-1 truncate">{process.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={process.status === "PUBLISHED" ? "default" : "secondary"} className="text-xs">
            {process.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
          </Badge>
          {process.tags.map((tag) => (
            <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full">{tag}</span>
          ))}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User size={11} /> {process.creatorName}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock size={11} /> {updatedAt}
          </span>
          {canEdit && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/processos/${id}/editar`}><Pencil size={13} className="mr-1" /> Editar</Link>
              </Button>
              <ProcessViewClient processId={id} />
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <ProcessViewClient
          processId={id}
          flowData={process.flowData}
          richText={process.richText}
          showContent
        />
      </div>
    </div>
  );
}
