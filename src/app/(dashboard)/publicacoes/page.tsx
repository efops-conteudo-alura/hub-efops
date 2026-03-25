import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PublicacoesClient } from "./_components/publicacoes-client";
import type { CarreiraLevel } from "@/app/(dashboard)/kpis/_components/carreiras-sync-button";

export default async function PublicacoesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const levels = await prisma.kpiCarreiraLevel.findMany({
    orderBy: [{ carreiraName: "asc" }, { order: "asc" }],
  });

  const serializedLevels: CarreiraLevel[] = levels.map((l) => ({
    id: l.id,
    carreiraSlug: l.carreiraSlug,
    carreiraName: l.carreiraName,
    levelName: l.levelName,
    order: l.order,
    isPublished: l.isPublished,
    firstPublishedAt: l.firstPublishedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return <PublicacoesClient isAdmin={isAdmin} initialLevels={serializedLevels} />;
}
