import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automations = await prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(automations);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name, type, shortDesc, fullDesc, thumbnailUrl, link, status,
    creator, tools, roiHoursSaved, roiMonthlySavings, roiDescription,
  } = body;

  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const automation = await prisma.automation.create({
    data: {
      name,
      type: type || "AUTOMATION",
      shortDesc: shortDesc || null,
      fullDesc: fullDesc || null,
      thumbnailUrl: thumbnailUrl || null,
      link: link || null,
      status: status || "ACTIVE",
      creator: creator || null,
      tools: tools || [],
      roiHoursSaved: roiHoursSaved ? parseFloat(roiHoursSaved) : null,
      roiMonthlySavings: roiMonthlySavings ? parseFloat(roiMonthlySavings) : null,
      roiDescription: roiDescription || null,
    },
  });

  return NextResponse.json(automation, { status: 201 });
}
