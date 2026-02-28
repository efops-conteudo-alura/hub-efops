import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const automation = await prisma.automation.findUnique({ where: { id } });
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(automation);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    name, type, shortDesc, fullDesc, thumbnailUrl, link, status,
    creator, tools, roiHoursSaved, roiMonthlySavings, roiDescription,
  } = body;

  const automation = await prisma.automation.update({
    where: { id },
    data: {
      name,
      type,
      shortDesc: shortDesc || null,
      fullDesc: fullDesc || null,
      thumbnailUrl: thumbnailUrl || null,
      link: link || null,
      status,
      creator: creator || null,
      tools: tools || [],
      roiHoursSaved: roiHoursSaved ? parseFloat(roiHoursSaved) : null,
      roiMonthlySavings: roiMonthlySavings ? parseFloat(roiMonthlySavings) : null,
      roiDescription: roiDescription || null,
    },
  });

  return NextResponse.json(automation);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.automation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
