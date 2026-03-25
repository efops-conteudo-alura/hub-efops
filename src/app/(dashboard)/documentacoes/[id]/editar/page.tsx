import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DocEditor } from "../../_components/doc-editor";

export default async function EditarDocPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await prisma.documentation.findUnique({ where: { id } });
  if (!doc) notFound();

  const isAdmin = session.user.role === "ADMIN";
  const isCreator = doc.creatorId === session.user.id;

  if (!isCreator && !isAdmin) redirect(`/documentacoes/${id}`);

  return (
    <div className="px-8 py-6 max-w-4xl">
      <DocEditor
        initial={{
          id: doc.id,
          title: doc.title,
          description: doc.description,
          content: doc.content,
          tags: doc.tags,
          status: doc.status,
        }}
      />
    </div>
  );
}
