import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ExternalLink, Code2, User, FolderGit2 } from "lucide-react"
import { EditProjectDialog } from "./edit-project-dialog"
import { DeleteButton } from "./delete-button"

export default async function ProjetoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "ADMIN"

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/projetos">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" />
            Voltar
          </Button>
        </Link>
        {isAdmin && (
          <div className="flex gap-2">
            <EditProjectDialog project={project} />
            <DeleteButton id={project.id} />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <FolderGit2 size={28} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.responsible && (
            <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
              <User size={14} />
              {project.responsible}
            </p>
          )}
        </div>
      </div>

      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {(project.url || project.repoUrl) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink size={14} className="mr-1.5" />
                  Acessar projeto
                </Button>
              </a>
            )}
            {project.repoUrl && (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Code2 size={14} className="mr-1.5" />
                  Ver repositório
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
