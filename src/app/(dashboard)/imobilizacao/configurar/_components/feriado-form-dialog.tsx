"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  ano: number;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FeriadoFormDialog({ open, ano, onOpenChange, onSuccess }: Props) {
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resetForm = () => {
    setData("");
    setDescricao("");
    setErro(null);
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const salvar = async () => {
    if (!data || !descricao.trim()) {
      setErro("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/imobilizacao/feriados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano, data, descricao: descricao.trim() }),
      });
      if (res.ok) {
        resetForm();
        onSuccess();
      } else {
        const json = await res.json();
        setErro(json.error ?? "Erro ao salvar.");
      }
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Feriado — {ano}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="feriadoData">Data *</Label>
            <Input
              id="feriadoData"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="feriadoDesc">Descrição *</Label>
            <Input
              id="feriadoDesc"
              placeholder="Ex: Ponto facultativo — véspera de Natal"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") salvar(); }}
            />
          </div>
          {erro && <p className="text-xs text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!data || !descricao.trim() || loading}>
            {loading ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
