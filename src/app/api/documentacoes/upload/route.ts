import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import mammoth from "mammoth";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ficheiro enviado como binário puro — nome e tamanho via query params
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename") ?? "documento.docx";
  const sizeParam = parseInt(searchParams.get("size") ?? "0", 10);

  if (!filename.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Apenas arquivos .docx são suportados" }, { status: 400 });
  }

  if (sizeParam > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 20 MB)" }, { status: 400 });
  }

  let html: string;
  try {
    const arrayBuf = await request.arrayBuffer();
    const nodeBuf = Buffer.from(arrayBuf);

    try {
      // Tenta converter com formatação, ignorando imagens
      const result = await mammoth.convertToHtml(
        { buffer: nodeBuf },
        {
          convertImage: mammoth.images.imgElement(() =>
            Promise.resolve({ src: "", alt: "[imagem]" })
          ),
        }
      );
      html = result.value;
    } catch {
      // Fallback: texto simples — funciona para exports do Notion e formatos incomuns
      const textResult = await mammoth.extractRawText({ buffer: nodeBuf });
      html = textResult.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${l}</p>`)
        .join("");
    }
  } catch {
    return NextResponse.json(
      { error: "Não foi possível processar o arquivo. Certifique-se de que é um .docx válido." },
      { status: 422 }
    );
  }

  const title = filename
    .replace(/\.docx$/i, "")
    .replace(/[-_]/g, " ")
    .trim();

  const doc = await prisma.documentation.create({
    data: {
      title,
      content: html || "<p></p>",
      tags: [],
      status: "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json({ id: doc.id });
}
