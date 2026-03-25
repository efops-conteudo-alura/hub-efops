import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  const processes = await prisma.process.findMany({
    where: {
      OR: [
        { status: "PUBLISHED" },
        { creatorId: session.user.id },
      ],
      ...(tag ? { tags: { has: tag } } : {}),
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
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(processes);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, description, tags, flowData, richText, status } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  const process = await prisma.process.create({
    data: {
      title: title.trim(),
      description: description || null,
      tags: tags || [],
      status: status || "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name ?? session.user.email ?? "Desconhecido",
      flowData: flowData || null,
      richText: richText || null,
    },
  });

  return NextResponse.json(process, { status: 201 });
}
