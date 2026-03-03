import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.documentation.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canAccess =
    doc.status === "PUBLISHED" ||
    doc.creatorId === session.user.id ||
    session.user.role === "ADMIN";

  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(doc);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.documentation.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = doc.creatorId === session.user.id || session.user.role === "ADMIN";
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, description, content, tags, status } = body;

  const updated = await prisma.documentation.update({
    where: { id },
    data: {
      title: title?.trim() || doc.title,
      description: description || null,
      content: content || null,
      tags: tags || [],
      status: status || doc.status,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.documentation.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = doc.creatorId === session.user.id || session.user.role === "ADMIN";
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.documentation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
