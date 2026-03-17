"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock } from "lucide-react";

interface AiReportBuilderProps {
  reportId?: string;
  initialTitle?: string;
  initialObjective?: string;
  initialInstructions?: string;
  initialNeedsFile?: boolean;
  initialNeedsDate?: boolean;
  initialOutputFormat?: string;
  initialNeedsClickup?: boolean;
  initialClickupListIds?: string;
  initialHasPresentation?: boolean;
  initialIsAdminOnly?: boolean;
  isAdmin?: boolean;
}

export function AiReportBuilder({
  reportId,
  initialTitle = "",
  initialObjective = "",
  initialInstructions = "",
  initialNeedsFile = true,
  initialNeedsDate = true,
  initialOutputFormat = "text",
  initialNeedsClickup = false,
  initialClickupListIds = "",
  initialHasPresentation = false,
  initialIsAdminOnly = false,
  isAdmin = false,
}: AiReportBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState(initialObjective);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [needsFile, setNeedsFile] = useState(initialNeedsFile);
  const [needsDate, setNeedsDate] = useState(initialNeedsDate);
  const [outputFormat, setOutputFormat] = useState(initialOutputFormat);
  const [needsClickup, setNeedsClickup] = useState(initialNeedsClickup);
  const [clickupListIds, setClickupListIds] = useState(initialClickupListIds);
  const [hasPresentation, setHasPresentation] = useState(initialHasPresentation);
  const [isAdminOnly, setIsAdminOnly] = useState(initialIsAdminOnly);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!reportId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título obrigatório."); return; }
    if (!instructions.trim()) { setError("Instruções para a IA são obrigatórias."); return; }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/relatorios/${reportId}` : "/api/relatorios";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "AI_ANALYSIS",
          title: title.trim(),
          objective: objective.trim() || null,
          aiInstructions: instructions.trim(),
          aiNeedsFile: needsFile,
          aiNeedsDate: needsDate,
          aiOutputFormat: outputFormat,
          aiNeedsClickup: needsClickup,
          aiClickupListIds: needsClickup ? clickupListIds.trim() || null : null,
          aiHasPresentation: hasPresentation,
          isAdminOnly,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao salvar relatório."); return; }
      router.push(`/relatorios/${isEdit ? reportId : json.id}`);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Radar de Sugestões de Cursos"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="objective">Objetivo</Label>
          <Textarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Descreva o propósito desta análise..."
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="instructions">
          Instruções para a IA <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Descreva como o Claude deve analisar os dados, o formato do relatório esperado e quaisquer regras especiais.
        </p>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Você é um analista de dados da Alura. Analise as sugestões de cursos e gere um relatório com..."
          rows={12}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
        <h3 className="text-sm font-medium">Parâmetros de execução</h3>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="needs-file" className="cursor-pointer">Requer upload de arquivo</Label>
            <p className="text-xs text-muted-foreground">Usuário deverá subir uma planilha (.xlsx ou .csv) ao executar</p>
          </div>
          <Switch
            id="needs-file"
            checked={needsFile}
            onCheckedChange={setNeedsFile}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="needs-date" className="cursor-pointer">Requer seleção de período</Label>
            <p className="text-xs text-muted-foreground">Usuário deverá informar data de início e fim para filtrar os dados</p>
          </div>
          <Switch
            id="needs-date"
            checked={needsDate}
            onCheckedChange={setNeedsDate}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="needs-clickup" className="cursor-pointer">Integrar com ClickUp</Label>
            <p className="text-xs text-muted-foreground">Busca tarefas em listas específicas no ClickUp e injeta no prompt da IA. Você encontra a ID da lista na URL. Ex: https://app.clickup.com/3148001/v/l/6-<em>901311315105</em>-1</p>
          </div>
          <Switch
            id="needs-clickup"
            checked={needsClickup}
            onCheckedChange={setNeedsClickup}
          />
        </div>

        {needsClickup && (
          <div className="space-y-1.5 pl-0">
            <Label htmlFor="clickup-list-ids">IDs das listas do ClickUp <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">
              Separe múltiplos IDs por vírgula. Ex: <code className="bg-muted px-1 rounded text-xs">abc123, def456</code>
            </p>
            <Input
              id="clickup-list-ids"
              value={clickupListIds}
              onChange={(e) => setClickupListIds(e.target.value)}
              placeholder="901234567, 901234568"
              className="font-mono text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="has-presentation" className="cursor-pointer">Exportar para Gamma</Label>
            <p className="text-xs text-muted-foreground">Inclua uma seção de roteiro de apresentação nas instruções — o sistema detecta automaticamente pelo contexto e a envia para o Gamma.app. O nome ou letra da seção não importa.</p>
          </div>
          <Switch
            id="has-presentation"
            checked={hasPresentation}
            onCheckedChange={setHasPresentation}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Formato de saída</Label>
          <div className="flex gap-4">
            {["text", "pdf"].map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="outputFormat"
                  value={fmt}
                  checked={outputFormat === fmt}
                  onChange={() => setOutputFormat(fmt)}
                  className="accent-primary"
                />
                {fmt === "text" ? "Texto na tela" : "Exportar PDF"}
              </label>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <h3 className="text-sm font-medium flex items-center gap-1.5"><Lock size={14} />Visibilidade</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-admin-only" className="cursor-pointer">Restrito a admins</Label>
              <p className="text-xs text-muted-foreground">Se ativado, usuários comuns não verão este relatório na lista</p>
            </div>
            <Switch
              id="is-admin-only"
              checked={isAdminOnly}
              onCheckedChange={setIsAdminOnly}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? <><Loader2 size={14} className="animate-spin mr-1" /> {isEdit ? "Salvando..." : "Criando..."}</>
            : isEdit ? "Salvar alterações" : "Criar análise"
          }
        </Button>
      </div>
    </form>
  );
}
