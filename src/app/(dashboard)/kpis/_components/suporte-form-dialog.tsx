"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface KpiSuporte {
  id: string;
  month: string;
  topicosRespondidos: number;
  slaMedio: number;
  artigosCriados: number;
  artigosRevisados: number;
  imersoes: number;
}

interface SuporteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  record?: KpiSuporte | null;
  onSaved: (record: KpiSuporte) => void;
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmtMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} / ${year}`;
}

const EMPTY = {
  topicosRespondidos: "0",
  slaMedio: "0",
  artigosCriados: "0",
  artigosRevisados: "0",
  imersoes: "0",
};

export function SuporteFormDialog({ open, onOpenChange, month, record, onSaved }: SuporteFormDialogProps) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setValues({
        topicosRespondidos: String(record.topicosRespondidos),
        slaMedio: String(record.slaMedio),
        artigosCriados: String(record.artigosCriados),
        artigosRevisados: String(record.artigosRevisados),
        imersoes: String(record.imersoes),
      });
    } else {
      setValues(EMPTY);
    }
    setError("");
  }, [record, open]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = record ? `/api/kpis/suporte/${record.id}` : "/api/kpis/suporte";
      const method = record ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          topicosRespondidos: parseInt(values.topicosRespondidos) || 0,
          slaMedio: parseFloat(values.slaMedio) || 0,
          artigosCriados: parseInt(values.artigosCriados) || 0,
          artigosRevisados: parseInt(values.artigosRevisados) || 0,
          imersoes: parseInt(values.imersoes) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        return;
      }
      const saved = await res.json();
      onSaved(saved);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof values; label: string; step?: string }[] = [
    { key: "topicosRespondidos", label: "Tópicos respondidos" },
    { key: "slaMedio", label: "SLA médio", step: "0.1" },
    { key: "artigosCriados", label: "Artigos criados" },
    { key: "artigosRevisados", label: "Artigos revisados" },
    { key: "imersoes", label: "Imersões" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{record ? "Editar" : "Adicionar"} KPI de Suporte Educacional</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <p className="text-sm font-medium text-muted-foreground">{fmtMonthLabel(month)}</p>
          {fields.map(({ key, label, step }) => (
            <div key={key} className="grid gap-1.5">
              <Label>{label}</Label>
              <Input
                type="number"
                min="0"
                step={step ?? "1"}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
