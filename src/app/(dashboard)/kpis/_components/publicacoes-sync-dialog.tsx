"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookDown, Loader2 } from "lucide-react";
import type { KpiProducao } from "./producao-form-dialog";

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

interface KpiAno {
  id: string;
  year: number;
}

interface Props {
  anos: KpiAno[];
  producao: KpiProducao[];
  onSuccess: () => void;
}

interface Preview {
  cursos: number;
  artigos: number;
  month: string;
}

export function PublicacoesSyncDialog({ anos, producao, onSuccess }: Props) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildMonth() {
    return `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  }

  function handleOpen() {
    setPreview(null);
    setError(null);
    setOpen(true);
  }

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/kpis/sync-publicacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: buildMonth() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao buscar publicações.");
        return;
      }
      const data: Preview = await res.json();
      setPreview(data);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      const month = buildMonth();
      const existing = producao.find((r) => r.month === month && r.costCenter === "ALURA");

      let res: Response;
      if (existing) {
        res = await fetch(`/api/kpis/producao/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cursos: preview.cursos, artigos: preview.artigos }),
        });
      } else {
        res = await fetch("/api/kpis/producao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month,
            costCenter: "ALURA",
            cursos: preview.cursos,
            artigos: preview.artigos,
            carreiras: 0,
            niveis: 0,
            trilhas: 0,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao salvar.");
        return;
      }

      setOpen(false);
      onSuccess();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  const sortedAnos = [...anos].sort((a, b) => b.year - a.year);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <BookDown size={14} className="mr-2" />
        Puxar de Publicações
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Puxar de Publicações</DialogTitle>
            <DialogDescription>
              Conta cursos e artigos publicados no mês selecionado e atualiza os KPIs.
              Tenha certeza de que as publicações estão sincronizadas antes de continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Mês</p>
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) => {
                    setSelectedMonth(Number(v));
                    setPreview(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1.5">Ano</p>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => {
                    setSelectedYear(Number(v));
                    setPreview(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedAnos.map((a) => (
                      <SelectItem key={a.id} value={String(a.year)}>
                        {a.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handlePreview}
              disabled={loadingPreview}
            >
              {loadingPreview && <Loader2 size={13} className="mr-2 animate-spin" />}
              Pré-visualizar
            </Button>

            {preview && (
              <div className="rounded-md border bg-card px-4 py-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide hub-tab-label mb-2">
                  {MESES[preview.month.split("-")[1] ? Number(preview.month.split("-")[1]) - 1 : 0]?.label} {preview.month.split("-")[0]}
                </p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl hub-number">{preview.cursos}</p>
                    <p className="text-xs text-muted-foreground">cursos</p>
                  </div>
                  <div>
                    <p className="text-2xl hub-number">{preview.artigos}</p>
                    <p className="text-xs text-muted-foreground">artigos</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!preview || saving}
            >
              {saving && <Loader2 size={13} className="mr-2 animate-spin" />}
              Salvar nos KPIs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
