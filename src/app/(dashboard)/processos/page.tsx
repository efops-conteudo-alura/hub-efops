import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProcessList } from "./_components/process-list";

export default async function ProcessosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const processes = await prisma.process.findMany({
    where: {
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
      creatorId: true,
      creatorName: true,
      updatedAt: true,
    },
  });

  return (
    <ProcessList
      processes={processes.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      currentUserId={session.user.id}
    />
  );
}
