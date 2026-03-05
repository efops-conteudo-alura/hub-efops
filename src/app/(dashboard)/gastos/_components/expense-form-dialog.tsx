"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

const CATEGORIES = [
  { value: "INSTRUTOR", label: "Instrutor" },
  { value: "EDITOR_FREELANCER", label: "Editor Freelancer" },
  { value: "EDITOR_EXTERNO", label: "Editor Externo" },
  { value: "SUPORTE_EDUCACIONAL", label: "Suporte Educacional" },
  { value: "OUTROS", label: "Outros" },
];

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Formato: AAAA-MM"),
  date: z.string().optional(),
  value: z.string().min(1, "Obrigatório"),
  category: z.string().min(1, "Obrigatório"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Expense {
  id: string;
  month: string;
  date?: string | null;
  value: number;
  category: string;
  description?: string | null;
  notes?: string | null;
}

interface Props {
  expense?: Expense;
  onSaved: () => void;
}

export function ExpenseFormDialog({ expense, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          month: expense.month,
          date: expense.date ?? "",
          value: String(expense.value),
          category: expense.category,
          description: expense.description ?? "",
          notes: expense.notes ?? "",
        }
      : { month: "", date: "", value: "", category: "", description: "", notes: "" },
  });

  // Quando o usuário preenche a data exata, auto-preenche o mês
  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; // AAAA-MM-DD (formato nativo do input type=date)
    setValue("date", val);
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      setValue("month", val.slice(0, 7));
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setError("");
    try {
      const url = expense ? `/api/gastos/${expense.id}` : "/api/gastos";
      const method = expense ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          date: data.date || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");
      setOpen(false);
      reset();
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const dateValue = watch("date");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {expense ? (
          <button className="p-1 rounded hover:bg-muted transition-colors">
            <Pencil size={14} className="text-muted-foreground" />
          </button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus size={15} className="mr-1" /> Adicionar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Editar gasto" : "Novo gasto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Data exata (opcional) — auto-preenche o mês */}
          <div className="space-y-1.5">
            <Label>Data exata <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
            />
            <p className="text-xs text-muted-foreground">
              Ao preencher a data, o mês é preenchido automaticamente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Mês (AAAA-MM) *</Label>
              <Input {...register("month")} placeholder="2026-01" />
              {errors.month && <p className="text-xs text-destructive">{errors.month.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input {...register("value")} placeholder="5000" />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Nome do instrutor / prestador</Label>
            <Input {...register("description")} placeholder="Ex: Daniele Castilho" />
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Input {...register("notes")} placeholder="Observações opcionais" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
