import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(prompts)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { titulo, descricao, conteudo, categoria } = body

  if (!titulo || typeof titulo !== "string" || !titulo.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 })
  }
  if (!conteudo || typeof conteudo !== "string" || !conteudo.trim()) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 })
  }

  const prompt = await prisma.prompt.create({
    data: {
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      conteudo: conteudo.trim(),
      categoria: categoria?.trim() || null,
      autorId: session.user.id,
      autorNome: session.user.name ?? session.user.email ?? "Usuário",
    },
  })
  return NextResponse.json(prompt, { status: 201 })
}
