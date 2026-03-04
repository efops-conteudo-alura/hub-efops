"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Pesos {
  id: string;
  curso: number;
  artigo: number;
  carreira: number;
  trilha: number;
}

interface PesosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pesos: Pesos;
  onSaved: (pesos: Pesos) => void;
}

export function PesosDialog({ open, onOpenChange, pesos, onSaved }: PesosDialogProps) {
  const [values, setValues] = useState({
    curso: String(pesos.curso),
    artigo: String(pesos.artigo),
    carreira: String(pesos.carreira),
    trilha: String(pesos.trilha),
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/kpis/pesos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curso: parseFloat(values.curso) || 0,
          artigo: parseFloat(values.artigo) || 0,
          carreira: parseFloat(values.carreira) || 0,
          trilha: parseFloat(values.trilha) || 0,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const updated = await res.json();
      onSaved(updated);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar Pesos de Produção</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {(["curso", "artigo", "carreira", "trilha"] as const).map((field) => (
            <div key={field} className="flex items-center gap-4">
              <Label className="w-24 capitalize">{field === "artigo" ? "Artigo" : field === "curso" ? "Curso" : field === "carreira" ? "Carreira" : "Trilha"}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={values[field]}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                className="w-24"
              />
            </div>
          ))}
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
