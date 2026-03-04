"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { ProducaoFormDialog, type KpiProducao } from "./producao-form-dialog";

interface Pesos {
  curso: number;
  artigo: number;
  carreira: number;
  trilha: number;
}

interface ProducaoTableProps {
  data: KpiProducao[];
  pesos: Pesos;
  onChange: (data: KpiProducao[]) => void;
}

function calcScore(row: KpiProducao, pesos: Pesos) {
  return row.cursos * pesos.curso + row.artigos * pesos.artigo + row.carreiras * pesos.carreira + row.trilhas * pesos.trilha;
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

export function ProducaoTable({ data, pesos, onChange }: ProducaoTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KpiProducao | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: KpiProducao) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/producao/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiProducao) {
    if (editing) {
      onChange(data.map((r) => (r.id === record.id ? record : r)));
    } else {
      onChange([record, ...data]);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus size={14} className="mr-1" /> Adicionar mês
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-center py-10 text-muted-foreground text-sm">Nenhum registro. Adicione o primeiro mês.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-center">Cursos</TableHead>
                <TableHead className="text-center">Artigos</TableHead>
                <TableHead className="text-center">Carreiras</TableHead>
                <TableHead className="text-center">Trilhas</TableHead>
                <TableHead className="text-center font-semibold">Score</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                  <TableCell className="text-center">{row.cursos}</TableCell>
                  <TableCell className="text-center">{row.artigos}</TableCell>
                  <TableCell className="text-center">{row.carreiras}</TableCell>
                  <TableCell className="text-center">{row.trilhas}</TableCell>
                  <TableCell className="text-center font-bold text-primary">{calcScore(row, pesos)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          <Pencil size={14} className="mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.id)}>
                          <Trash2 size={14} className="mr-2" /> Apagar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProducaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
