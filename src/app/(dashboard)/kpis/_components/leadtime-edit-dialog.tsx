"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadtimeTaskRow } from "./leadtime-clickup-panel";
import type { KpiLeadtime } from "./leadtime-form-dialog";

// Campos comuns para edição (manual e ClickUp)
interface EditValues {
  nome: string;
  costCenter: "ALURA" | "LATAM";
  dataInicio: string;
  dataConclusao: string;
  dataGravInicio: string;
  dataGravFim: string;
  instrutor: string;
  responsavel: string;
}

const EMPTY: EditValues = {
  nome: "",
  costCenter: "ALURA",
  dataInicio: "",
  dataConclusao: "",
  dataGravInicio: "",
  dataGravFim: "",
  instrutor: "",
  responsavel: "",
};

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

interface LeadtimeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCostCenter: "ALURA" | "LATAM";
  // Quando editando uma LeadtimeTask (ClickUp)
  editingClickup?: LeadtimeTaskRow | null;
  // Quando editando ou criando uma KpiLeadtime (manual)
  editingManual?: KpiLeadtime | null;
  // Callback com o row atualizado
  onSavedClickup?: (row: LeadtimeTaskRow) => void;
  onSavedManual?: (row: KpiLeadtime) => void;
}

export function LeadtimeEditDialog({
  open,
  onOpenChange,
  defaultCostCenter,
  editingClickup,
  editingManual,
  onSavedClickup,
  onSavedManual,
}: LeadtimeEditDialogProps) {
  const [values, setValues] = useState<EditValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isNew = !editingClickup && !editingManual;
  const isClickup = !!editingClickup;

  useEffect(() => {
    if (editingClickup) {
      setValues({
        nome: editingClickup.name,
        costCenter: (editingClickup.costCenter as "ALURA" | "LATAM") ?? defaultCostCenter,
        dataInicio: isoToDateInput(editingClickup.dataInicio),
        dataConclusao: isoToDateInput(editingClickup.dataConclusao),
        dataGravInicio: isoToDateInput(editingClickup.dataGravInicio),
        dataGravFim: isoToDateInput(editingClickup.dataGravFim),
        instrutor: "",
        responsavel: "",
      });
    } else if (editingManual) {
      setValues({
        nome: editingManual.nome,
        costCenter: (editingManual.costCenter as "ALURA" | "LATAM") ?? defaultCostCenter,
        dataInicio: editingManual.dataInicio ?? "",
        dataConclusao: editingManual.dataConclusao ?? "",
        dataGravInicio: editingManual.inicioGravacao ?? "",
        dataGravFim: editingManual.fimGravacao ?? "",
        instrutor: editingManual.instrutor ?? "",
        responsavel: editingManual.responsavel ?? "",
      });
    } else {
      setValues({ ...EMPTY, costCenter: defaultCostCenter });
    }
    setError("");
  }, [editingClickup, editingManual, defaultCostCenter, open]);

  function set(key: keyof EditValues) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function handleSave() {
    if (!values.nome.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (isClickup && editingClickup) {
        // Editar LeadtimeTask (ClickUp)
        const res = await fetch(`/api/kpis/leadtimes/${editingClickup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.nome,
            costCenter: values.costCenter,
            dataInicio: values.dataInicio || null,
            dataConclusao: values.dataConclusao || null,
            dataGravInicio: values.dataGravInicio || null,
            dataGravFim: values.dataGravFim || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Erro ao salvar");
          return;
        }
        const saved: LeadtimeTaskRow = await res.json();
        onSavedClickup?.(saved);
      } else {
        // Criar ou editar KpiLeadtime (manual)
        const url = editingManual ? `/api/kpis/leadtime/${editingManual.id}` : "/api/kpis/leadtime";
        const method = editingManual ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            costCenter: values.costCenter,
            nome: values.nome,
            dataInicio: values.dataInicio || null,
            dataConclusao: values.dataConclusao || null,
            inicioGravacao: values.dataGravInicio || null,
            fimGravacao: values.dataGravFim || null,
            inicioEdicao: editingManual?.inicioEdicao ?? null,
            fimEdicao: editingManual?.fimEdicao ?? null,
            instrutor: values.instrutor || null,
            responsavel: values.responsavel || null,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Erro ao salvar");
          return;
        }
        const saved: KpiLeadtime = await res.json();
        onSavedManual?.(saved);
      }

      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const title = isNew ? "Adicionar curso" : `Editar curso${isClickup ? " (ClickUp)" : ""}`;
  const showGrav = values.costCenter === "LATAM" || !!values.dataGravInicio || !!values.dataGravFim;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Nome do curso *</Label>
            <Input value={values.nome} onChange={set("nome")} />
          </div>

          <div className="grid gap-1.5">
            <Label>Centro de custo</Label>
            <select
              value={values.costCenter}
              onChange={set("costCenter")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALURA">Alura</option>
              <option value="LATAM">Latam</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Início</Label>
              <Input type="date" value={values.dataInicio} onChange={set("dataInicio")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Conclusão</Label>
              <Input type="date" value={values.dataConclusao} onChange={set("dataConclusao")} />
            </div>
          </div>

          {(showGrav || values.costCenter === "LATAM") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Grav. início</Label>
                <Input type="date" value={values.dataGravInicio} onChange={set("dataGravInicio")} />
              </div>
              <div className="grid gap-1.5">
                <Label>Grav. fim</Label>
                <Input type="date" value={values.dataGravFim} onChange={set("dataGravFim")} />
              </div>
            </div>
          )}

          {!isClickup && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Instrutor</Label>
                <Input value={values.instrutor} onChange={set("instrutor")} />
              </div>
              <div className="grid gap-1.5">
                <Label>Responsável</Label>
                <Input value={values.responsavel} onChange={set("responsavel")} />
              </div>
            </div>
          )}

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
