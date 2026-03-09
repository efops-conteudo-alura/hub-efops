"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const schema = z.object({
  ano: z.coerce.number().min(2020).max(2100),
  mes: z.coerce.number().min(1).max(12),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  feriados: z.coerce.number().min(0).default(0),
  diasUteis: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (novoPeriodo?: { ano: number; mes: number }) => void;
}

export function PeriodoFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      ano: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      feriados: 0,
      diasUteis: 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/imobilizacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Erro ao criar período");
        return;
      }
      const criado = await res.json();
      reset();
      onOpenChange(false);
      onSuccess({ ano: criado.ano, mes: criado.mes });
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Período</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="ano">Ano *</Label>
              <Input id="ano" type="number" {...register("ano")} />
              {errors.ano && <p className="text-xs text-destructive">{errors.ano.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="mes">Mês *</Label>
              <select
                id="mes"
                {...register("mes")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {MESES.map((nome, i) => (
                  <option key={i + 1} value={i + 1}>{nome}</option>
                ))}
              </select>
              {errors.mes && <p className="text-xs text-destructive">{errors.mes.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="dataInicio">Data início</Label>
              <Input id="dataInicio" type="date" {...register("dataInicio")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dataFim">Data fim</Label>
              <Input id="dataFim" type="date" {...register("dataFim")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="feriados">Feriados</Label>
              <Input id="feriados" type="number" min={0} {...register("feriados")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="diasUteis">Dias úteis</Label>
              <Input id="diasUteis" type="number" min={0} {...register("diasUteis")} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Criar Período"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
