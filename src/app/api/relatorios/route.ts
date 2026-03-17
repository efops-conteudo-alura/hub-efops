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
  const { type, title, objective, fields, aiInstructions, aiNeedsFile, aiNeedsDate, aiOutputFormat, aiNeedsClickup, aiClickupListIds, aiHasPresentation, isAdminOnly } = body as {
    type?: string;
    title?: string;
    objective?: string;
    fields?: unknown[];
    aiInstructions?: string;
    aiNeedsFile?: boolean;
    aiNeedsDate?: boolean;
    aiOutputFormat?: string;
    aiNeedsClickup?: boolean;
    aiClickupListIds?: string | null;
    aiHasPresentation?: boolean;
    isAdminOnly?: boolean;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  if (type === "AI_ANALYSIS") {
    if (!aiInstructions?.trim()) {
      return NextResponse.json({ error: "Instruções para a IA são obrigatórias" }, { status: 400 });
    }
    const report = await prisma.report.create({
      data: {
        type: "AI_ANALYSIS",
        title: title.trim(),
        objective: objective?.trim() || null,
        fields: [],
        aiInstructions: aiInstructions.trim(),
        aiNeedsFile: aiNeedsFile ?? true,
        aiNeedsDate: aiNeedsDate ?? true,
        aiOutputFormat: aiOutputFormat ?? "text",
        aiNeedsClickup: aiNeedsClickup ?? false,
        aiClickupListIds: aiClickupListIds ?? null,
        aiHasPresentation: aiHasPresentation ?? false,
        isAdminOnly: isAdminOnly ?? false,
      },
    });
    return NextResponse.json(report, { status: 201 });
  }

  if (!Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "Adicione ao menos um campo" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      title: title.trim(),
      objective: objective?.trim() || null,
      fields: fields as object[],
      isAdminOnly: isAdminOnly ?? false,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
