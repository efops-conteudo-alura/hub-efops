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

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Apenas arquivos .docx são suportados" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 10 MB)" }, { status: 400 });
  }

  let html: string;
  try {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(buffer) },
      {
        // Imagens são substituídas por um placeholder — evita travar em documentos
        // com muitas imagens grandes (base64 embutido é muito pesado)
        convertImage: mammoth.images.imgElement(() =>
          Promise.resolve({ src: "", alt: "[imagem não importada]" })
        ),
      }
    );
    html = result.value;
  } catch {
    return NextResponse.json(
      { error: "Não foi possível processar o arquivo. Certifique-se de que é um .docx válido." },
      { status: 422 }
    );
  }

  const title = file.name
    .replace(/\.docx$/i, "")
    .replace(/[-_]/g, " ")
    .trim();

  const doc = await prisma.documentation.create({
    data: {
      title,
      content: html,
      tags: [],
      status: "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json({ id: doc.id });
}
