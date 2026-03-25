import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const maxDuration = 120;

const GAMMA_API = "https://public-api.gamma.app/v1.0";

function formatForGamma(apresentacao: string): string {
  const text = apresentacao.trim();

  // Tenta parsear linhas "- Slide N: Título — Conteúdo" e adiciona separadores ---
  const lines = text.split("\n");
  const slides: string[] = [];

  for (const line of lines) {
    const m = line.match(/^[-*\s]*[Ss]lide\s+\d+:\s*(.+)/);
    if (!m) continue;
    const full = m[1].trim();
    const dashIdx = full.search(/\s[—–-]{1,2}\s/);
    if (dashIdx !== -1) {
      const title = full.slice(0, dashIdx).trim();
      const content = full.slice(dashIdx).replace(/^[\s—–-]+/, "").trim();
      slides.push(`# ${title}\n${content}`);
    } else {
      slides.push(`# ${full}`);
    }
  }

  if (slides.length >= 3) return slides.join("\n\n---\n\n");

  // Fallback: envia o texto limpo sem marcação extra
  return text.replace(/\*\*/g, "").trim();
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; resultId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gammaApiKey = process.env.GAMMA_API_KEY;
  if (!gammaApiKey) {
    return NextResponse.json({ error: "GAMMA_API_KEY não configurada" }, { status: 500 });
  }

  const { id, resultId } = await params;
  const resultado = await prisma.aiAnaliseResult.findUnique({
    where: { id: resultId },
    include: { report: { select: { isAdminOnly: true } } },
  });
  if (!resultado || resultado.reportId !== id) {
    return NextResponse.json({ error: "Resultado não encontrado" }, { status: 404 });
  }
  if (resultado.report.isAdminOnly && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!resultado.resultadoApresentacao) {
    return NextResponse.json(
      { error: "Este resultado não possui roteiro de apresentação (seção F)." },
      { status: 400 }
    );
  }

  // Já exportado anteriormente
  if (resultado.gammaUrl) {
    return NextResponse.json({ gammaUrl: resultado.gammaUrl });
  }

  const inputText = formatForGamma(resultado.resultadoApresentacao);

  // 1. Criar geração no Gamma
  const createRes = await fetch(`${GAMMA_API}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": gammaApiKey,
    },
    body: JSON.stringify({
      inputText,
      textMode: "generate",
      format: "presentation",
      numCards: 8,
      textOptions: {
        amount: "medium",
        language: "pt-br",
      },
      imageOptions: {
        source: "pictographic",
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    return NextResponse.json({ error: `Gamma API error: ${err}` }, { status: 502 });
  }

  const { generationId } = await createRes.json() as { generationId: string };

  // 2. Polling até completar (máx 20 tentativas × 5s = 100s)
  let gammaUrl: string | null = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(`${GAMMA_API}/generations/${generationId}`, {
      headers: { "X-API-KEY": gammaApiKey },
    });

    if (!pollRes.ok) continue;

    const data = await pollRes.json() as {
      status: "pending" | "completed" | "failed";
      gammaUrl?: string;
    };

    if (data.status === "completed" && data.gammaUrl) {
      gammaUrl = data.gammaUrl;
      break;
    }
    if (data.status === "failed") {
      return NextResponse.json({ error: "Gamma falhou ao gerar a apresentação." }, { status: 502 });
    }
  }

  if (!gammaUrl) {
    return NextResponse.json(
      { error: "Timeout aguardando o Gamma. Tente novamente em instantes." },
      { status: 504 }
    );
  }

  // 3. Salvar gammaUrl no banco
  await prisma.aiAnaliseResult.update({
    where: { id: resultId },
    data: { gammaUrl },
  });

  return NextResponse.json({ gammaUrl });
}
