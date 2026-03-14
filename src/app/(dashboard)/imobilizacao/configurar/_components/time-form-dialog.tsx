"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  nome: z.string().min(1, "Nome é obrigatório"),
  clickupListId: z.string().min(1, "ID da lista ClickUp é obrigatório"),
  clickupListIdsAdicionais: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Time {
  id: string;
  nome: string;
  clickupListId: string;
  clickupListIdsAdicionais: string | null;
}

interface Props {
  open: boolean;
  time?: Time;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TimeFormDialog({ open, time, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", clickupListId: "", clickupListIdsAdicionais: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: time?.nome ?? "",
        clickupListId: time?.clickupListId ?? "",
        clickupListIdsAdicionais: time?.clickupListIdsAdicionais ?? "",
      });
      setError(null);
    }
  }, [open, time, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const url = time ? `/api/imobilizacao/times/${time.id}` : "/api/imobilizacao/times";
      const method = time ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.nome,
          clickupListId: data.clickupListId,
          clickupListIdsAdicionais: data.clickupListIdsAdicionais?.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Erro ao salvar");
        return;
      }
      onSuccess();
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
          <DialogTitle>{time ? "Editar Time" : "Novo Time"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome do Time *</Label>
            <Input id="nome" placeholder="Ex: Conteúdo" {...register("nome")} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="clickupListId">ID da Lista ClickUp *</Label>
            <Input
              id="clickupListId"
              placeholder="Ex: 901306782159"
              {...register("clickupListId")}
            />
            {errors.clickupListId && (
              <p className="text-xs text-destructive">{errors.clickupListId.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Encontre o ID na URL do ClickUp: /v/li/<strong>ID</strong>
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="clickupListIdsAdicionais">Listas adicionais (opcional)</Label>
            <Input
              id="clickupListIdsAdicionais"
              placeholder="Ex: 901306782160, 901306782161"
              {...register("clickupListIdsAdicionais")}
            />
            <p className="text-xs text-muted-foreground">
              IDs separados por vírgula. Usados quando mais de uma lista compõe o mesmo time.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : time ? "Salvar" : "Criar Time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
