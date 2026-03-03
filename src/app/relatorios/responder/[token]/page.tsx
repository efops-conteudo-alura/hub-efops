"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gauge, CheckCircle2, Loader2 } from "lucide-react";

interface ReportField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select";
  required: boolean;
  options?: string[];
}

interface FormData {
  title: string;
  objective: string | null;
  fields: ReportField[];
}

export default function ResponderFormPage() {
  const { token } = useParams<{ token: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/relatorios/form/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setLoadError(j.error ?? "Formulário não encontrado.");
          return;
        }
        const data = await res.json();
        setForm(data);
      })
      .catch(() => setLoadError("Não foi possível carregar o formulário."));
  }, [token]);

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/relatorios/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao enviar resposta.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header simples */}
      <header className="border-b px-6 py-3 flex items-center gap-2">
        <Gauge size={20} className="text-primary" />
        <span className="font-bold text-base">EFops Hub</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {loadError ? (
            <div className="text-center py-20">
              <p className="text-destructive font-medium">{loadError}</p>
            </div>
          ) : !form ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : submitted ? (
            <div className="text-center py-20 space-y-3">
              <CheckCircle2 size={48} className="mx-auto text-green-500" />
              <h2 className="text-xl font-semibold">Resposta enviada!</h2>
              <p className="text-muted-foreground">Obrigado por preencher o formulário.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-1">
                <h1 className="text-2xl font-bold">{form.title}</h1>
                {form.objective && (
                  <p className="text-muted-foreground text-sm">{form.objective}</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {form.fields.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.id}
                        value={values[field.id] ?? ""}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        required={field.required}
                        rows={3}
                      />
                    ) : field.type === "select" ? (
                      <Select
                        value={values[field.id] ?? ""}
                        onValueChange={(v) => setValue(field.id, v)}
                        required={field.required}
                      >
                        <SelectTrigger id={field.id}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type}
                        value={values[field.id] ?? ""}
                        onChange={(e) => setValue(field.id, e.target.value)}
                        required={field.required}
                      />
                    )}
                  </div>
                ))}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? (
                    <><Loader2 size={14} className="animate-spin mr-1" /> Enviando...</>
                  ) : (
                    "Enviar resposta"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
