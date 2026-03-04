"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface KpiProducao {
  id: string;
  month: string;
  cursos: number;
  artigos: number;
  carreiras: number;
  niveis: number;
  trilhas: number;
}

interface ProducaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: KpiProducao | null;
  onSaved: (record: KpiProducao) => void;
}

const EMPTY = { month: "", cursos: "0", artigos: "0", carreiras: "0", niveis: "0", trilhas: "0" };

export function ProducaoFormDialog({ open, onOpenChange, record, onSaved }: ProducaoFormDialogProps) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setValues({
        month: record.month,
        cursos: String(record.cursos),
        artigos: String(record.artigos),
        carreiras: String(record.carreiras),
        niveis: String(record.niveis),
        trilhas: String(record.trilhas),
      });
    } else {
      setValues(EMPTY);
    }
    setError("");
  }, [record, open]);

  async function handleSave() {
    if (!values.month || !/^\d{4}-\d{2}$/.test(values.month)) {
      setError("Mês deve estar no formato AAAA-MM (ex: 2026-02)");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = record ? `/api/kpis/producao/${record.id}` : "/api/kpis/producao";
      const method = record ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: values.month,
          cursos: parseInt(values.cursos) || 0,
          artigos: parseInt(values.artigos) || 0,
          carreiras: parseInt(values.carreiras) || 0,
          niveis: parseInt(values.niveis) || 0,
          trilhas: parseInt(values.trilhas) || 0,
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

  const fields: { key: keyof typeof values; label: string }[] = [
    { key: "cursos", label: "Cursos" },
    { key: "artigos", label: "Artigos" },
    { key: "carreiras", label: "Carreiras (completas)" },
    { key: "niveis", label: "Níveis de Carreira" },
    { key: "trilhas", label: "Trilhas" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{record ? "Editar" : "Adicionar"} KPI de Produção</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Mês (AAAA-MM)</Label>
            <Input
              placeholder="2026-02"
              value={values.month}
              disabled={!!record}
              onChange={(e) => setValues((v) => ({ ...v, month: e.target.value }))}
            />
          </div>
          {fields.map(({ key, label }) => (
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
