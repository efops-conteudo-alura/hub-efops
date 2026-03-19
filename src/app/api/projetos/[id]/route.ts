import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, description, url, responsible, repoUrl } = body

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      url: url?.trim() || null,
      responsible: responsible?.trim() || null,
      repoUrl: repoUrl?.trim() || null,
    },
  })
  return NextResponse.json(project)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
