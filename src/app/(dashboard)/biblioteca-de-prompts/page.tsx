import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { PromptsClient } from "./_components/prompts-client"

export default async function BibliotecaDePromptsPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const userId = session?.user?.id ?? ""

  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "desc" },
  })

  const serialized = prompts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <div className="p-6">
      <PromptsClient prompts={serialized} userId={userId} isAdmin={isAdmin} />
    </div>
  )
}
