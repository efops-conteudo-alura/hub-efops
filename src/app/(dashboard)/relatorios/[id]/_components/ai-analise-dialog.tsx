"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";

interface AiAnaliseReport {
  id: string;
  title: string;
  aiNeedsFile: boolean;
  aiNeedsDate: boolean;
}

interface AiResultado {
  id: string;
  params: Record<string, string>;
  resultado: string;
  resultadoApresentacao: string | null;
  gammaUrl: string | null;
  totalRows: number | null;
  createdAt: string;
}

interface AiAnaliseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AiAnaliseReport;
  onSuccess: (resultado: AiResultado) => void;
}

export function AiAnaliseDialog({ open, onOpenChange, report, onSuccess }: AiAnaliseDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    if (loading) return;
    setFile(null);
    setPeriodoInicio("");
    setPeriodoFim("");
    setError(null);
    onOpenChange(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (report.aiNeedsFile && !file) { setError("Selecione um arquivo."); return; }
    if (report.aiNeedsDate && (!periodoInicio || !periodoFim)) { setError("Informe o período completo."); return; }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) formData.append("arquivo", file);
      if (periodoInicio) formData.append("periodoInicio", periodoInicio);
      if (periodoFim) formData.append("periodoFim", periodoFim);

      const res = await fetch(`/api/relatorios/${report.id}/executar`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao executar análise."); return; }

      onSuccess(json);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Executar análise</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {report.aiNeedsFile && (
            <div className="space-y-1.5">
              <Label>Arquivo de dados <span className="text-destructive">*</span></Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.csv,.xls"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <div className="space-y-1">
                    <Upload size={20} className="mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar .xlsx ou .csv</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {report.aiNeedsDate && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Data início <span className="text-destructive">*</span></Label>
                <Input
                  id="inicio"
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fim">Data fim <span className="text-destructive">*</span></Label>
                <Input
                  id="fim"
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 size={14} className="animate-spin shrink-0" />
              Analisando dados com IA... isso pode levar até 40 segundos.
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={loading}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" /> Analisando...</> : "Gerar análise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
