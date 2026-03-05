"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface KpiEdicao {
  id: string;
  month: string;
  correcoes: number;
  entregasConteudo: number;
  entregasStart: number;
  entregasLatam: number;
  entregasMarketing: number;
  entregasOutras: number;
}

interface EdicaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mês no formato YYYY-MM — pré-definido, não editável */
  month: string;
  record?: KpiEdicao | null;
  onSaved: (record: KpiEdicao) => void;
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fmtMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} / ${year}`;
}

const EMPTY = {
  correcoes: "0",
  entregasConteudo: "0",
  entregasStart: "0",
  entregasLatam: "0",
  entregasMarketing: "0",
  entregasOutras: "0",
};

export function EdicaoFormDialog({ open, onOpenChange, month, record, onSaved }: EdicaoFormDialogProps) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setValues({
        correcoes: String(record.correcoes),
        entregasConteudo: String(record.entregasConteudo),
        entregasStart: String(record.entregasStart),
        entregasLatam: String(record.entregasLatam),
        entregasMarketing: String(record.entregasMarketing),
        entregasOutras: String(record.entregasOutras),
      });
    } else {
      setValues(EMPTY);
    }
    setError("");
  }, [record, open]);

  const totalEntregas =
    (parseInt(values.entregasConteudo) || 0) +
    (parseInt(values.entregasStart) || 0) +
    (parseInt(values.entregasLatam) || 0) +
    (parseInt(values.entregasMarketing) || 0) +
    (parseInt(values.entregasOutras) || 0);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const url = record ? `/api/kpis/edicao/${record.id}` : "/api/kpis/edicao";
      const method = record ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          correcoes: parseInt(values.correcoes) || 0,
          entregasConteudo: parseInt(values.entregasConteudo) || 0,
          entregasStart: parseInt(values.entregasStart) || 0,
          entregasLatam: parseInt(values.entregasLatam) || 0,
          entregasMarketing: parseInt(values.entregasMarketing) || 0,
          entregasOutras: parseInt(values.entregasOutras) || 0,
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

  const entregasFields: { key: keyof typeof values; label: string }[] = [
    { key: "entregasConteudo", label: "Conteúdo" },
    { key: "entregasStart", label: "Start" },
    { key: "entregasLatam", label: "Latam" },
    { key: "entregasMarketing", label: "Marketing" },
    { key: "entregasOutras", label: "Outras (PM3, B2B, DHO...)" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{record ? "Editar" : "Adicionar"} KPI de Edição</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <p className="text-sm font-medium text-muted-foreground">{fmtMonthLabel(month)}</p>
          <div className="grid gap-1.5">
            <Label>Correções</Label>
            <Input
              type="number"
              min="0"
              value={values.correcoes}
              onChange={(e) => setValues((v) => ({ ...v, correcoes: e.target.value }))}
            />
          </div>
          <Separator />
          <p className="text-sm font-medium">Distribuição de Entregas</p>
          {entregasFields.map(({ key, label }) => (
            <div key={key} className="grid gap-1.5">
              <Label>{label}</Label>
              <Input
                type="number"
                min="0"
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Total de entregas: {totalEntregas}</p>
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
