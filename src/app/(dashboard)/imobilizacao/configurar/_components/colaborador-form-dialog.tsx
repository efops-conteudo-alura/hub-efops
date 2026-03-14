"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  clickupUsername: z.string().optional(),
  matricula: z.string().optional(),
  cargaHorariaDiaria: z.coerce.number().min(1).max(24).default(8),
  tipo: z.enum(["NORMAL", "LIDER", "ESPECIAL"]).default("NORMAL"),
  ignorar: z.boolean().default(false),
  // Campos de regra (serializados em regraJson)
  regraLiderados: z.string().optional(), // nomes separados por vírgula
  regraEspecialTipo: z.enum(["1H_OU_5H", "FIXO_POR_CURSO", ""]).default(""),
  regraHorasPresente: z.coerce.number().optional(),
  regraHorasAusente: z.coerce.number().optional(),
  regraHorasFixas: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface Colaborador {
  id: string;
  nome: string;
  clickupUsername: string | null;
  matricula: string | null;
  cargaHorariaDiaria: number;
  tipo: "NORMAL" | "LIDER" | "ESPECIAL";
  regraJson: string | null;
  ignorar: boolean;
}

interface Props {
  open: boolean;
  timeId: string;
  colaborador?: Colaborador;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function parseRegraJson(col?: Colaborador): Partial<FormData> {
  if (!col?.regraJson) return {};
  try {
    const r = JSON.parse(col.regraJson);
    if (col.tipo === "LIDER") {
      return { regraLiderados: (r.liderados ?? []).join(", ") };
    }
    if (r.tipo === "1H_OU_5H") {
      return {
        regraEspecialTipo: "1H_OU_5H",
        regraHorasPresente: r.horasPresente,
        regraHorasAusente: r.horasAusente,
      };
    }
    if (r.tipo === "FIXO_POR_CURSO") {
      return { regraEspecialTipo: "FIXO_POR_CURSO", regraHorasFixas: r.horas };
    }
  } catch {
    return {};
  }
  return {};
}

function buildRegraJson(data: FormData): Record<string, unknown> | null {
  if (data.tipo === "LIDER") {
    const liderados = (data.regraLiderados ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return liderados.length > 0 ? { liderados } : null;
  }
  if (data.tipo === "ESPECIAL") {
    if (data.regraEspecialTipo === "1H_OU_5H") {
      return {
        tipo: "1H_OU_5H",
        horasPresente: data.regraHorasPresente ?? 5,
        horasAusente: data.regraHorasAusente ?? 1,
      };
    }
    if (data.regraEspecialTipo === "FIXO_POR_CURSO") {
      return { tipo: "FIXO_POR_CURSO", horas: data.regraHorasFixas ?? 1 };
    }
  }
  return null;
}

export function ColaboradorFormDialog({
  open,
  timeId,
  colaborador,
  onOpenChange,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      clickupUsername: "",
      matricula: "",
      cargaHorariaDiaria: 8,
      tipo: "NORMAL",
      ignorar: false,
      regraLiderados: "",
      regraEspecialTipo: "",
      regraHorasPresente: 5,
      regraHorasAusente: 1,
      regraHorasFixas: 1,
    },
  });

  const tipo = useWatch({ control, name: "tipo" });
  const regraEspecialTipo = useWatch({ control, name: "regraEspecialTipo" });

  useEffect(() => {
    if (open) {
      reset({
        nome: colaborador?.nome ?? "",
        clickupUsername: colaborador?.clickupUsername ?? "",
        matricula: colaborador?.matricula ?? "",
        cargaHorariaDiaria: colaborador?.cargaHorariaDiaria ?? 8,
        tipo: colaborador?.tipo ?? "NORMAL",
        ignorar: colaborador?.ignorar ?? false,
        regraEspecialTipo: "",
        regraHorasPresente: 5,
        regraHorasAusente: 1,
        regraHorasFixas: 1,
        ...parseRegraJson(colaborador),
      });
      setError(null);
    }
  }, [open, colaborador, reset]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const regraJson = buildRegraJson(data);
      const payload = {
        nome: data.nome,
        clickupUsername: data.clickupUsername || null,
        matricula: data.matricula || null,
        cargaHorariaDiaria: data.cargaHorariaDiaria,
        tipo: data.tipo,
        ignorar: data.ignorar,
        regraJson,
      };

      const url = colaborador
        ? `/api/imobilizacao/times/${timeId}/colaboradores/${colaborador.id}`
        : `/api/imobilizacao/times/${timeId}/colaboradores`;
      const method = colaborador ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{colaborador ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input id="nome" placeholder="Igual ao nome no ClickUp" {...register("nome")} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="clickupUsername">Username ClickUp</Label>
              <Input
                id="clickupUsername"
                placeholder="Se diferente do nome"
                {...register("clickupUsername")}
              />
              <p className="text-xs text-muted-foreground">Deixe vazio se igual ao nome.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input id="matricula" {...register("matricula")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cargaHorariaDiaria">Carga horária diária (h)</Label>
              <Input id="cargaHorariaDiaria" type="number" min={1} max={24} {...register("cargaHorariaDiaria")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                {...register("tipo")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="NORMAL">Normal — fórmula base</option>
                <option value="LIDER">Líder — 1h se liderado tiver horas</option>
                <option value="ESPECIAL">Especial — regra customizada</option>
              </select>
            </div>
          </div>

          {/* Campos dinâmicos por tipo */}
          {tipo === "LIDER" && (
            <div className="space-y-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Label htmlFor="regraLiderados">Nomes dos liderados (separados por vírgula)</Label>
              <Input
                id="regraLiderados"
                placeholder="Ex: João Silva, Maria Santos"
                {...register("regraLiderados")}
              />
              <p className="text-xs text-muted-foreground">
                O líder receberá 1h em cada curso onde algum desses colaboradores tiver horas.
              </p>
            </div>
          )}

          {tipo === "ESPECIAL" && (
            <div className="space-y-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div className="space-y-1">
                <Label>Tipo de regra especial</Label>
                <select
                  {...register("regraEspecialTipo")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="1H_OU_5H">Base + Presente (ex: 1h sempre, 5h se no curso)</option>
                  <option value="FIXO_POR_CURSO">Fixo por curso até o máximo (ex: 1h, 5h...)</option>
                </select>
              </div>

              {regraEspecialTipo === "1H_OU_5H" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Horas se ausente</Label>
                    <Input type="number" min={0} {...register("regraHorasAusente")} />
                  </div>
                  <div className="space-y-1">
                    <Label>Horas se presente</Label>
                    <Input type="number" min={0} {...register("regraHorasPresente")} />
                  </div>
                </div>
              )}

              {regraEspecialTipo === "FIXO_POR_CURSO" && (
                <div className="space-y-1">
                  <Label>Horas por curso</Label>
                  <Input type="number" min={1} {...register("regraHorasFixas")} />
                  <p className="text-xs text-muted-foreground">
                    Será alocado neste valor em cada curso, até atingir o máximo (75% das horas do mês).
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              id="ignorar"
              type="checkbox"
              {...register("ignorar")}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="ignorar" className="cursor-pointer font-normal">
              Ignorar este colaborador (não aparece nas tabelas e não gera erros)
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : colaborador ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
