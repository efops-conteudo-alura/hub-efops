import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ProcessEditor } from "../../_components/process-editor";

export default async function EditarProcessoPage({
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
  if (!canEdit) redirect(`/processos/${id}`);

  return <ProcessEditor initialData={process} />;
}
