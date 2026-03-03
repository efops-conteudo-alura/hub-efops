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
    const arrayBuf = await file.arrayBuffer();
    const nodeBuf = Buffer.from(arrayBuf);

    // Tenta converter com formatação, ignorando imagens
    try {
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
      // Fallback: extrai só o texto puro (funciona para exports do Notion e outros formatos incomuns)
      const textResult = await mammoth.extractRawText({ buffer: nodeBuf });
      // Converte parágrafos de texto em HTML simples
      html = textResult.value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join("");
    }
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
      content: html || "<p></p>",
      tags: [],
      status: "DRAFT",
      creatorId: session.user.id,
      creatorName: session.user.name || session.user.email || "Usuário",
    },
  });

  return NextResponse.json({ id: doc.id });
}
