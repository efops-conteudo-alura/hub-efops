import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, url, description } = body as { title?: string; url?: string; description?: string };

  const link = await prisma.usefulLink.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(url !== undefined && { url: url.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });
  return NextResponse.json(link);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.usefulLink.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
