import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FileText } from "lucide-react";
import { DocList } from "./_components/doc-list";

export default async function DocumentacoesPage() {
  const session = await auth();
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="hub-page-title">Documentações</h1>
        <p className="hub-section-title">Base de conhecimento do time</p>
      </div>

      <DocList docs={serialized} />
    </div>
  );
}
