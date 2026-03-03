"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";

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

export function ReportBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [fields, setFields] = useState<ReportField[]>([
    { id: generateId(), label: "", type: "text", required: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/relatorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, objective, fields: validFields }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao criar relatório."); return; }
      router.push(`/relatorios/${json.id}`);
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
              <div className="space-y-1.5">
                <Label>Opções <span className="text-muted-foreground text-xs">(separadas por vírgula)</span></Label>
                <Input
                  value={field.options?.join(", ") ?? ""}
                  onChange={(e) =>
                    updateField(field.id, "options", e.target.value.split(",").map((o) => o.trim()).filter(Boolean))
                  }
                  placeholder="Ex: Sim, Não, Talvez"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id={`required-${field.id}`}
                checked={field.required}
                onCheckedChange={(v) => updateField(field.id, "required", !!v)}
              />
              <Label htmlFor={`required-${field.id}`} className="text-sm cursor-pointer">
                Campo obrigatório
              </Label>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <><Loader2 size={14} className="animate-spin mr-1" /> Criando...</> : "Criar relatório"}
        </Button>
      </div>
    </form>
  );
}
