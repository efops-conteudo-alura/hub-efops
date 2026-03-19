import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { assunto, tipoConteudo, tipoPesquisa, nivel, eixos, focoGeo, plataformas } =
      await request.json();

    const prompt = `Você é um analista de mercado especializado em edtech (educação em tecnologia).

Faça uma pesquisa de mercado sobre: "${assunto}"

Tipo de conteúdo: ${tipoConteudo} (curso específico ou carreira/trilha completa)
Tipo de pesquisa: ${tipoPesquisa}
Nível do conteúdo: ${nivel}
Foco geográfico: ${focoGeo}
${plataformas ? `Plataformas prioritárias: ${plataformas}` : ""}

Analise nos seguintes eixos: ${(eixos as string[]).join(", ")}

Estruture o resultado em markdown com:
1. Resumo executivo (3-4 linhas)
2. Tabela comparativa entre as principais plataformas encontradas
3. Análise detalhada por eixo solicitado
4. Lacunas e oportunidades identificadas
5. Fontes consultadas

Priorize dados atuais (2025-2026). Foque em plataformas relevantes para o público brasileiro.`;

    let resultado: string;
    let usouWebSearch = false;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        tools: [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      });
      resultado = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
      usouWebSearch = true;
    } catch {
      // Fallback sem web search (ex: recurso não habilitado na conta)
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });
      resultado = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");
    }

    const pesquisa = await prisma.pesquisaMercado.create({
      data: {
        assunto,
        tipoConteudo,
        tipoPesquisa,
        nivel,
        eixos,
        focoGeo,
        plataformas: plataformas || null,
        resultado,
        autorNome: session.user?.name ?? "Desconhecido",
        autorEmail: session.user?.email ?? "",
      },
    });

    return NextResponse.json({ id: pesquisa.id, resultado, usouWebSearch });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pesquisas = await prisma.pesquisaMercado.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      assunto: true,
      tipoConteudo: true,
      tipoPesquisa: true,
      autorNome: true,
      createdAt: true,
      resultado: true,
    },
  });

  return NextResponse.json(pesquisas);
}
