import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.usefulLink.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, url, description } = body as { title?: string; url?: string; description?: string };

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }
  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "URL é obrigatória" }, { status: 400 });
  }

  const count = await prisma.usefulLink.count();
  const link = await prisma.usefulLink.create({
    data: { title: title.trim(), url: url.trim(), description: description?.trim() || null, order: count },
  });
  return NextResponse.json(link, { status: 201 });
}
