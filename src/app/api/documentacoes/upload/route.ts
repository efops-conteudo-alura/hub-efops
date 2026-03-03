import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import mammoth from "mammoth";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

  if (!file.name.endsWith(".docx")) {
    return NextResponse.json({ error: "Apenas arquivos .docx são suportados" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });

  const title = file.name.replace(/\.docx$/i, "").replace(/[-_]/g, " ").trim();

  const doc = await prisma.documentation.create({
    data: {
      title,
      content: result.value,
      tags: [],
      status: "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json({ id: doc.id });
}
