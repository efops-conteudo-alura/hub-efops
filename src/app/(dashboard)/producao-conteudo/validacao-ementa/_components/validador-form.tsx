"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Copy,
  Check,
  ClipboardCheck,
  Save,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { extrairResumo } from "../_utils";

const PROMPT_PADRAO = `Você é um especialista em design instrucional e desenvolvimento de cursos online para a Alura. Sua tarefa é avaliar ementas de cursos enviadas por instrutores e gerar uma sugestão estruturada.

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

interface Resultado {
  avaliacao: string;
  sugestaoEmenta: string;
}

type BlocoCopiado = "resumo" | "avaliacao" | "sugestao";

export function ValidadorForm() {
  const router = useRouter();
  const [nomeCurso, setNomeCurso] = useState("");
  const [ementa, setEmenta] = useState("");
  const [promptCustomizado, setPromptCustomizado] = useState("");
  const [promptAberto, setPromptAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadoBloco, setCopiadoBloco] = useState<Record<BlocoCopiado, boolean>>({
    resumo: false,
    avaliacao: false,
    sugestao: false,
  });
  const [salvando, setSalvando] = useState(false);
  const [salvou, setSalvou] = useState(false);

  // Salvar na biblioteca de prompts
  const [dialogBiblioteca, setDialogBiblioteca] = useState(false);
  const [tituloPrompt, setTituloPrompt] = useState("");
  const [categoriaPrompt, setCategoriaPrompt] = useState("Validação de Ementa");
  const [salvandoPrompt, setSalvandoPrompt] = useState(false);
  const [salvoPrompt, setSalvoPrompt] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ementa.trim()) return;

    setLoading(true);
    setErro(null);
    setResultado(null);
    setSalvou(false);

    try {
      const res = await fetch("/api/producao-conteudo/validar-ementa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ementa,
          nomeCurso,
          customPrompt: promptCustomizado.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar a ementa");
      }

      const data = await res.json();
      setResultado(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function copiarBloco(texto: string, bloco: BlocoCopiado) {
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiadoBloco((prev) => ({ ...prev, [bloco]: true }));
        setTimeout(() => setCopiadoBloco((prev) => ({ ...prev, [bloco]: false })), 2000);
      })
      .catch(() => {
        setErro("Não foi possível copiar para a área de transferência.");
      });
  }

  async function salvarAnalise() {
    if (!resultado || !nomeCurso.trim()) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/producao-conteudo/ementas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nomeCurso,
          ementaOriginal: ementa,
          avaliacao: resultado.avaliacao,
          sugestaoEmenta: resultado.sugestaoEmenta,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSalvou(true);
      router.refresh();
    } catch {
      setErro("Não foi possível salvar a análise. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNaBiblioteca() {
    if (!tituloPrompt.trim() || !promptCustomizado.trim()) return;
    setSalvandoPrompt(true);
    try {
      const res = await fetch("/api/biblioteca-de-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: tituloPrompt.trim(),
          conteudo: promptCustomizado.trim(),
          categoria: categoriaPrompt.trim() || null,
          descricao: "Prompt para validação de ementa — salvo via Validação de Ementa",
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setSalvoPrompt(true);
      setTimeout(() => {
        setDialogBiblioteca(false);
        setSalvoPrompt(false);
        setTituloPrompt("");
      }, 1500);
    } catch {
      setErro("Não foi possível salvar o prompt na biblioteca. Tente novamente.");
    } finally {
      setSalvandoPrompt(false);
    }
  }

  const { resumo, avaliacaoSemResumo } = resultado
    ? extrairResumo(resultado.avaliacao)
    : { resumo: "", avaliacaoSemResumo: "" };

  return (
    <div className="space-y-6">
      {/* Formulário de entrada */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="space-y-1.5">
          <Label htmlFor="nomeCurso">Nome / Assunto do curso</Label>
          <Input
            id="nomeCurso"
            placeholder="Ex: N8N para Marketing — Automação de Pipeline de Dados"
            value={nomeCurso}
            onChange={(e) => setNomeCurso(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ementa">Ementa do instrutor</Label>
          <Textarea
            id="ementa"
            placeholder="Cole aqui a ementa recebida do instrutor — pode incluir objetivo, ferramentas, projeto, módulos e lista de vídeos..."
            rows={16}
            value={ementa}
            onChange={(e) => setEmenta(e.target.value)}
            className="font-mono text-sm resize-y"
            disabled={loading}
          />
        </div>

        {/* Accordion: Personalizar prompt */}
        <div className="rounded-md border">
          <button
            type="button"
            onClick={() => setPromptAberto(!promptAberto)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Personalizar prompt de análise</span>
            {promptAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {promptAberto && (
            <div className="border-t px-4 pb-4 pt-3 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Se vazio, usa o prompt padrão da Alura. Edite para personalizar a análise.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 shrink-0"
                  onClick={() => setPromptCustomizado(PROMPT_PADRAO)}
                >
                  Carregar prompt padrão
                </Button>
              </div>
              <Textarea
                placeholder="Cole ou escreva aqui seu prompt personalizado..."
                rows={12}
                value={promptCustomizado}
                onChange={(e) => setPromptCustomizado(e.target.value)}
                className="font-mono text-xs resize-y"
                disabled={loading}
              />
              {promptCustomizado.trim() && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTituloPrompt("");
                      setCategoriaPrompt("Validação de Ementa");
                      setDialogBiblioteca(true);
                    }}
                  >
                    <BookOpen size={14} className="mr-1.5" />
                    Salvar na biblioteca de prompts
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || !ementa.trim()}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Analisando... isso pode levar até 30 segundos
              </>
            ) : (
              <>
                <ClipboardCheck size={16} className="mr-2" />
                Validar Ementa
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Erro */}
      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Análise concluída.</p>
            <div className="flex items-center gap-2">
              {salvou ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check size={14} />
                  Análise salva
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={salvarAnalise}
                  disabled={salvando || !nomeCurso.trim()}
                  title={!nomeCurso.trim() ? "Preencha o nome do curso para salvar" : ""}
                >
                  {salvando ? (
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                  ) : (
                    <Save size={14} className="mr-1.5" />
                  )}
                  Salvar análise
                </Button>
              )}
            </div>
          </div>

          {/* Grid de dois painéis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {/* Coluna 1: Resumo + Avaliação */}
            <div className="space-y-4">
              {resumo && (
                <Card>
                  <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Resumo</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copiarBloco(resumo, "resumo")}
                      className="shrink-0 gap-1.5 text-muted-foreground"
                    >
                      {copiadoBloco.resumo ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copiar
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <MarkdownRenderer content={resumo} />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Avaliação detalhada</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copiarBloco(avaliacaoSemResumo || resultado.avaliacao, "avaliacao")}
                    className="shrink-0 gap-1.5 text-muted-foreground"
                  >
                    {copiadoBloco.avaliacao ? (
                      <>
                        <Check size={14} className="text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copiar
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <MarkdownRenderer content={avaliacaoSemResumo || resultado.avaliacao} />
                </CardContent>
              </Card>
            </div>

            {/* Sugestão de Ementa */}
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base">Sugestão de Ementa</CardTitle>
                {resultado.sugestaoEmenta && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copiarBloco(resultado.sugestaoEmenta, "sugestao")}
                    className="shrink-0 gap-1.5 text-muted-foreground"
                  >
                    {copiadoBloco.sugestao ? (
                      <>
                        <Check size={14} className="text-green-500" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copiar
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {resultado.sugestaoEmenta ? (
                  <MarkdownRenderer content={resultado.sugestaoEmenta} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Sugestão não gerada. Tente novamente.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Dialog: Salvar na biblioteca de prompts */}
      <Dialog open={dialogBiblioteca} onOpenChange={setDialogBiblioteca}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar na biblioteca de prompts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tituloPrompt">Título *</Label>
              <Input
                id="tituloPrompt"
                placeholder="Ex: Prompt de validação focado em cursos de IA"
                value={tituloPrompt}
                onChange={(e) => setTituloPrompt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoriaPrompt">Categoria</Label>
              <Input
                id="categoriaPrompt"
                placeholder="Ex: Validação de Ementa"
                value={categoriaPrompt}
                onChange={(e) => setCategoriaPrompt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBiblioteca(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvarNaBiblioteca}
              disabled={!tituloPrompt.trim() || salvandoPrompt}
            >
              {salvandoPrompt ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : salvoPrompt ? (
                <Check size={14} className="mr-1.5 text-green-500" />
              ) : (
                <Save size={14} className="mr-1.5" />
              )}
              {salvoPrompt ? "Salvo!" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
