import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(report);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { title, objective, fields } = body as {
    title?: string;
    objective?: string;
    fields?: unknown[];
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "Adicione ao menos um campo" }, { status: 400 });
  }

  const report = await prisma.report.update({
    where: { id },
    data: {
      title: title.trim(),
      objective: objective?.trim() || null,
      fields: fields as object[],
    },
  });

  return NextResponse.json(report);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.report.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
