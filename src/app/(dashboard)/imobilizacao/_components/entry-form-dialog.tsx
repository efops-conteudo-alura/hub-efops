"use client";

import { useState, useEffect } from "react";
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

const schema = z.object({
  colaboradorNome: z.string().min(1, "Nome obrigatório"),
  colaboradorMatricula: z.string().optional(),
  cargaHorariaTotal: z.coerce.number().optional(),
  cargaHorariaDiaria: z.coerce.number().optional(),
  produtoTipo: z.string().optional(),
  produtoId: z.string().optional(),
  produtoNome: z.string().min(1, "Nome do produto obrigatório"),
  horas: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof schema>;

export interface EntryData {
  id: string;
  colaboradorNome: string;
  colaboradorMatricula: string | null;
  cargaHorariaTotal: number | null;
  cargaHorariaDiaria: number | null;
  produtoTipo: string | null;
  produtoId: string | null;
  produtoNome: string;
  horas: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  ano: number;
  mes: number;
  entry?: EntryData | null;
}

export function EntryFormDialog({ open, onOpenChange, onSuccess, ano, mes, entry }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!entry;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { horas: 0 },
  });

  useEffect(() => {
    if (entry) {
      reset({
        colaboradorNome: entry.colaboradorNome,
        colaboradorMatricula: entry.colaboradorMatricula ?? "",
        cargaHorariaTotal: entry.cargaHorariaTotal ?? undefined,
        cargaHorariaDiaria: entry.cargaHorariaDiaria ?? undefined,
        produtoTipo: entry.produtoTipo ?? "",
        produtoId: entry.produtoId ?? "",
        produtoNome: entry.produtoNome,
        horas: entry.horas,
      });
    } else {
      reset({ horas: 0 });
    }
  }, [entry, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = isEditing
        ? `/api/imobilizacao/${ano}/${mes}/entries/${entry!.id}`
        : `/api/imobilizacao/${ano}/${mes}/entries`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Erro ao salvar lançamento");
        return;
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="colaboradorNome">Colaborador *</Label>
              <Input id="colaboradorNome" {...register("colaboradorNome")} />
              {errors.colaboradorNome && (
                <p className="text-xs text-destructive">{errors.colaboradorNome.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="colaboradorMatricula">Matrícula</Label>
              <Input id="colaboradorMatricula" {...register("colaboradorMatricula")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="produtoTipo">Tipo de produto</Label>
              <Input id="produtoTipo" placeholder="curso, trilha, artigo..." {...register("produtoTipo")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="produtoId">ID do produto</Label>
              <Input id="produtoId" {...register("produtoId")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horas">Horas *</Label>
              <Input id="horas" type="number" min={0} {...register("horas")} />
              {errors.horas && <p className="text-xs text-destructive">{errors.horas.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="produtoNome">Nome do produto *</Label>
            <Input id="produtoNome" {...register("produtoNome")} />
            {errors.produtoNome && (
              <p className="text-xs text-destructive">{errors.produtoNome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="cargaHorariaTotal">Carga horária total (h)</Label>
              <Input id="cargaHorariaTotal" type="number" min={0} {...register("cargaHorariaTotal")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cargaHorariaDiaria">Carga horária diária (h)</Label>
              <Input id="cargaHorariaDiaria" type="number" min={0} {...register("cargaHorariaDiaria")} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
