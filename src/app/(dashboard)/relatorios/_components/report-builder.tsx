"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type FieldType = "text" | "number" | "date" | "textarea" | "select";

interface ReportField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto curto",
  number: "Número",
  date: "Data",
  textarea: "Texto longo",
  select: "Seleção",
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ReportBuilderProps {
  reportId?: string;
  initialTitle?: string;
  initialObjective?: string;
  initialFields?: ReportField[];
  initialIsAdminOnly?: boolean;
}

export function ReportBuilder({
  reportId,
  initialTitle = "",
  initialObjective = "",
  initialFields,
  initialIsAdminOnly = false,
}: ReportBuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [objective, setObjective] = useState(initialObjective);
  const [fields, setFields] = useState<ReportField[]>(
    initialFields ?? [{ id: generateId(), label: "", type: "text", required: false }]
  );
  const [isAdminOnly, setIsAdminOnly] = useState(initialIsAdminOnly);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!reportId;

  function addField() {
    setFields((prev) => [...prev, { id: generateId(), label: "", type: "text", required: false }]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField<K extends keyof ReportField>(id: string, key: K, value: ReportField[K]) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título obrigatório."); return; }
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) { setError("Adicione ao menos um campo com label."); return; }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/relatorios/${reportId}` : "/api/relatorios";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, objective, fields: validFields, isAdminOnly }),
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Título e objetivo */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Controle de Horas — Fevereiro"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="objective">Objetivo</Label>
          <Textarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Descreva o propósito deste relatório..."
            rows={2}
          />
        </div>
      </div>

      {/* Campos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Campos do formulário</h2>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus size={14} className="mr-1" /> Adicionar campo
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Campo {index + 1}</span>
              <button
                type="button"
                onClick={() => removeField(field.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Remover campo"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Label <span className="text-destructive">*</span></Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(field.id, "label", e.target.value)}
                  placeholder="Ex: Nome completo"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Tipo</Label>
                <Select
                  value={field.type}
                  onValueChange={(v) => updateField(field.id, "type", v as FieldType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {field.type === "select" && (
              <div className="space-y-2">
                <Label>Opções</Label>
                {(field.options ?? []).map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...(field.options ?? [])];
                        next[optIdx] = e.target.value;
                        updateField(field.id, "options", next);
                      }}
                      placeholder={`Opção ${optIdx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = (field.options ?? []).filter((_, i) => i !== optIdx);
                        updateField(field.id, "options", next);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Remover opção"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateField(field.id, "options", [...(field.options ?? []), ""])}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus size={12} /> Adicionar opção
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`required-${field.id}`}
                checked={field.required}
                onChange={(e) => updateField(field.id, "required", e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
              />
              <Label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer">
                Campo obrigatório
              </Label>
            </div>
          </div>
        ))}
      </div>

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? <><Loader2 size={14} className="animate-spin mr-1" /> {isEdit ? "Salvando..." : "Criando..."}</>
            : isEdit ? "Salvar alterações" : "Criar relatório"
          }
        </Button>
      </div>
    </form>
  );
}
