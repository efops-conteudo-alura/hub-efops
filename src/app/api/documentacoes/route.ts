import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.documentation.findMany({
    where: {
      OR: [
        { status: "PUBLISHED" },
        { creatorId: session.user.id },
        ...(session.user.role === "ADMIN" ? [{}] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(docs);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, content, tags, status } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  const doc = await prisma.documentation.create({
    data: {
      title: title.trim(),
      description: description || null,
      content: content || null,
      tags: tags || [],
      status: status || "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
