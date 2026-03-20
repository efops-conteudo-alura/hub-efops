import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é um especialista em design instrucional e desenvolvimento de cursos online para a Alura. Sua tarefa é avaliar ementas de cursos enviadas por instrutores e gerar uma sugestão estruturada.

## O que você deve fazer

Analise o TEXTO da ementa em duas dimensões independentes e gere uma saída com dois blocos separados pelo marcador exato: ---SUGESTAO_EMENTA---

## Instruções críticas

- Analise apenas o TEXTO — nunca caracterize ou rotule o instrutor como pessoa
- Na sugestão de ementa, preserve TODO o conteúdo e conhecimento presente na ementa original — nunca invente tópicos, nunca remova informação valiosa
- Se identificar lacunas pedagógicas, aponte-as com sugestão de como preenchê-las
- Cada mudança estrutural na sugestão deve ter uma justificativa clara inline (usando "> Por que:")
- Numeração nos títulos de vídeos é irrelevante — ignore completamente
- Seja direto e construtivo no feedback — reconheça o que o texto já tem de bom antes de apontar problemas

## Formato de saída

Produza EXATAMENTE neste formato (sem desvios):

## Dimensão 1 — Qualidade do ensino

### Objetivo vs. conteúdo
[✅ / ⚠️ / ❌] [análise: o objetivo declarado é alcançável com os vídeos listados? Falta conteúdo?]

### Projeto/entregável
[✅ / ⚠️ / ❌] [análise: o entregável é concreto? O aluno sabe o que vai criar ao final?]

### Lacunas pedagógicas
[✅ Nenhuma identificada / ⚠️ lista de lacunas com sugestão de como endereçar cada uma]

### Profundidade e progressão do conteúdo
[✅ / ⚠️ / ❌] [análise: a progressão dos módulos faz sentido didático? A profundidade é adequada ao objetivo?]

## Dimensão 2 — Organização e escrita

### Objetivo (perspectiva do aluno)
[✅ / ⚠️ / ❌] [análise: está escrito como "o aluno vai saber fazer X" ou como "o instrutor vai ensinar Y"?]

### Título / Ferramentas
[✅ / ⚠️ / ❌] [análise: título preenchido? ferramentas listadas?]

### Estrutura dos módulos e vídeos
[✅ / ⚠️ / ❌] [análise: há vídeos sem título ou sem objetivo? módulos sem nome claro?]

### Coesão
[✅ / ⚠️ / ❌] [análise: os objetivos dos vídeos se conectam ao objetivo geral? algum módulo foge do tema?]

### Padrão Alura
[✅ / ⚠️ / ❌] [análise: cada módulo tem "Para saber mais", "Faça como eu fiz" e "O que aprendemos?"? Se não, indicar quais estão faltando]

## Resumo para o instrutor
[Parágrafo direto e construtivo em português. Reconhece o que o texto já tem de bom. Lista de forma clara o que precisa ser revisto. Tom respeitoso e profissional.]

---SUGESTAO_EMENTA---

> **Critério desta sugestão:** [2-3 linhas explicando o que foi preservado da ementa original, o que foi reorganizado e por quê]

[Para cada módulo:]
-[Nome do módulo]
> Por que: [justificativa se o nome foi alterado ou se há sugestão de conteúdo adicional para preencher lacuna]
*[Vídeo 1]
*[Vídeo 2]
*Para saber mais: [tema relevante baseado no conteúdo do módulo]
*Faça como eu fiz: [atividade prática baseada no que foi ensinado]
*O que aprendemos?

[Repetir para cada módulo. Incluir sempre a Conclusão no último módulo ou como item final.]`;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const ementa = body?.ementa?.trim();
  const nomeCurso = body?.nomeCurso?.trim();
  const customPrompt = typeof body?.customPrompt === "string" ? body.customPrompt.trim() : "";

  if (!ementa) {
    return NextResponse.json({ error: "Ementa não pode ser vazia" }, { status: 400 });
  }

  const systemPrompt = customPrompt || SYSTEM_PROMPT;

  const contexto = nomeCurso
    ? `Título/assunto do curso informado pelo coordenador: "${nomeCurso}"\n\n`
    : "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${contexto}Analise a seguinte ementa de curso:\n\n${ementa}`,
        },
      ],
    });

    const content = message.content[0]?.type === "text" ? message.content[0].text : "";
    const separator = "---SUGESTAO_EMENTA---";
    const sepIndex = content.indexOf(separator);

    if (sepIndex === -1) {
      return NextResponse.json({ avaliacao: content, sugestaoEmenta: "" });
    }

    const avaliacao = content.slice(0, sepIndex).trim();
    const sugestaoEmenta = content.slice(sepIndex + separator.length).trim();

    return NextResponse.json({ avaliacao, sugestaoEmenta });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao processar ementa";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
