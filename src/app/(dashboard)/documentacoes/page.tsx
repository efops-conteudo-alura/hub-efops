import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookOpen } from "lucide-react";
import { DocList } from "./_components/doc-list";

export default async function DocumentacoesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  const docs = await prisma.documentation.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { status: "PUBLISHED" },
            { creatorId: session.user.id },
          ],
        },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      status: true,
      creatorName: true,
      updatedAt: true,
    },
  });

  const serialized = docs.map((d) => ({
    ...d,
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <div className="px-8 py-6">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={22} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold">Documentações</h1>
          <p className="text-sm text-muted-foreground">Base de conhecimento do time</p>
        </div>
      </div>

      <DocList docs={serialized} />
    </div>
  );
}
