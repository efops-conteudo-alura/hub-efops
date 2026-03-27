import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderGit2, ExternalLink, Code2, User } from "lucide-react"
import { NewProjectDialog } from "./new-project-dialog"

export default async function ProjetosPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="hub-page-title">Projetos</h1>
          <p className="text-muted-foreground text-sm">
            {projects.length} projeto{projects.length !== 1 ? "s" : ""} cadastrado{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && <NewProjectDialog />}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
          <FolderGit2 size={48} className="opacity-20" />
          <p className="text-lg font-medium">Nenhum projeto cadastrado</p>
          <p className="text-sm">Adicione o primeiro projeto do time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/projetos/${project.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <FolderGit2 size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                    <CardTitle className="hub-card-title leading-tight">{project.name}</CardTitle>
                  </div>
                  {project.description && (
                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {project.responsible && (
                      <div className="flex items-center gap-1.5">
                        <User size={13} />
                        <span className="truncate">{project.responsible}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      {project.url && (
                        <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          <ExternalLink size={11} />
                          App
                        </span>
                      )}
                      {project.repoUrl && (
                        <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          <Code2 size={11} />
                          Repo
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
