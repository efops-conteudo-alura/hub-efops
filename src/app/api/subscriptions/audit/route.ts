import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.subscriptionAudit.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(entries);
}
