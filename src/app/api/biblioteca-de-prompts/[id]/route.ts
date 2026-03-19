import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { titulo, descricao, conteudo, categoria } = body

  if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
  }
  if (!conteudo || typeof conteudo !== "string" || !conteudo.trim()) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 })
  }

  const prompt = await prisma.prompt.update({
    where: { id },
    data: {
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      conteudo: conteudo.trim(),
      categoria: categoria?.trim() || null,
    },
  })
  return NextResponse.json(prompt)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const prompt = await prisma.prompt.findUnique({ where: { id } })
  if (!prompt) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

  const isAdmin = session.user.role === "ADMIN"
  const isCreator = prompt.autorId === session.user.id

  if (!isAdmin && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.prompt.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
