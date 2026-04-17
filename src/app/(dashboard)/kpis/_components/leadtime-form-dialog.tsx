"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface KpiLeadtime {
  id: string;
  costCenter: string;
  nome: string;
  dataInicio: string;
  inicioGravacao: string | null;
  fimGravacao: string | null;
  inicioEdicao: string | null;
  fimEdicao: string | null;
  dataConclusao: string | null;
  instrutor: string | null;
  responsavel: string | null;
}

interface LeadtimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter: "ALURA" | "LATAM";
  record?: KpiLeadtime | null;
  onSaved: (record: KpiLeadtime) => void;
}

const EMPTY = {
  nome: "",
  dataInicio: "",
  inicioGravacao: "",
  fimGravacao: "",
  inicioEdicao: "",
  fimEdicao: "",
  dataConclusao: "",
  instrutor: "",
  responsavel: "",
};

export function LeadtimeFormDialog({ open, onOpenChange, costCenter, record, onSaved }: LeadtimeFormDialogProps) {
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) {
      setValues({
        nome: record.nome,
        dataInicio: record.dataInicio,
        inicioGravacao: record.inicioGravacao ?? "",
        fimGravacao: record.fimGravacao ?? "",
        inicioEdicao: record.inicioEdicao ?? "",
        fimEdicao: record.fimEdicao ?? "",
        dataConclusao: record.dataConclusao ?? "",
        instrutor: record.instrutor ?? "",
        responsavel: record.responsavel ?? "",
      });
    } else {
      setValues(EMPTY);
    }
    setError("");
  }, [record, open]);

  function set(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function handleSave() {
    if (!values.nome || !values.dataInicio) {
      setError("Nome e data de início são obrigatórios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = record ? `/api/kpis/leadtime/${record.id}` : "/api/kpis/leadtime";
      const method = record ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costCenter,
          nome: values.nome,
          dataInicio: values.dataInicio,
          inicioGravacao: values.inicioGravacao || null,
          fimGravacao: values.fimGravacao || null,
          inicioEdicao: values.inicioEdicao || null,
          fimEdicao: values.fimEdicao || null,
          dataConclusao: values.dataConclusao || null,
          instrutor: values.instrutor || null,
          responsavel: values.responsavel || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? "Editar" : "Adicionar"} curso — {costCenter === "ALURA" ? "Conteúdo" : "LATAM"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Nome do curso *</Label>
            <Input value={values.nome} onChange={set("nome")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Data de início *</Label>
              <Input type="date" value={values.dataInicio} onChange={set("dataInicio")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Data de conclusão</Label>
              <Input type="date" value={values.dataConclusao} onChange={set("dataConclusao")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Início gravação</Label>
              <Input type="date" value={values.inicioGravacao} onChange={set("inicioGravacao")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Fim gravação</Label>
              <Input type="date" value={values.fimGravacao} onChange={set("fimGravacao")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Início edição</Label>
              <Input type="date" value={values.inicioEdicao} onChange={set("inicioEdicao")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Fim edição</Label>
              <Input type="date" value={values.fimEdicao} onChange={set("fimEdicao")} />
            </div>
          </div>
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
