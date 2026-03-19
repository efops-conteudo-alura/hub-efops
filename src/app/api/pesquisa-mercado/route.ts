import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
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

  const autorNome = session.user?.name ?? "Desconhecido";
  const autorEmail = session.user?.email ?? "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      let usouWebSearch = false;

      const enqueue = (text: string) => {
        fullText += text;
        controller.enqueue(encoder.encode(text));
      };

      try {
        try {
          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4000,
            tools: [{ type: "web_search_20250305" as "web_search_20250305", name: "web_search" }],
            messages: [{ role: "user", content: prompt }],
          });

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              enqueue(event.delta.text);
            }
          }
          usouWebSearch = true;
        } catch {
          // Fallback sem web search
          fullText = "";
          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 4000,
            messages: [{ role: "user", content: prompt }],
          });

          for await (const event of anthropicStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              enqueue(event.delta.text);
            }
          }
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
            resultado: fullText,
            autorNome,
            autorEmail,
          },
        });

        controller.enqueue(
          encoder.encode(
            `\n\n<!--META:${JSON.stringify({ id: pesquisa.id, usouWebSearch })}-->`
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n<!--ERROR:${msg}-->`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
