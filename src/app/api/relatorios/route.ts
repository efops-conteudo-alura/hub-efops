import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const report = await prisma.report.create({
    data: {
      title: title.trim(),
      objective: objective?.trim() || null,
      fields: fields as object[],
    },
  });

  return NextResponse.json(report, { status: 201 });
}
