"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import { EdicaoFormDialog, type KpiEdicao } from "./edicao-form-dialog";

interface EdicaoTableProps {
  data: KpiEdicao[];
  onChange: (data: KpiEdicao[]) => void;
}

function totalEntregas(row: KpiEdicao) {
  return row.entregasConteudo + row.entregasStart + row.entregasLatam + row.entregasMarketing + row.entregasOutras;
}

function calcScoreEdicao(row: KpiEdicao) {
  const total = totalEntregas(row);
  if (total === 0) return 0;
  return Math.round(200 * (1 - row.correcoes / total));
}

function pct(part: number, total: number) {
  if (total === 0) return "—";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${year}`;
}

export function EdicaoTable({ data, onChange }: EdicaoTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KpiEdicao | null>(null);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: KpiEdicao) {
    setEditing(row);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await fetch(`/api/kpis/edicao/${id}`, { method: "DELETE" });
    onChange(data.filter((r) => r.id !== id));
  }

  function handleSaved(record: KpiEdicao) {
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
        <>
          {/* Tabela: KPI de Edição */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Total Entregas</TableHead>
                  <TableHead className="text-center">Correções</TableHead>
                  <TableHead className="text-center font-semibold">Score Edição</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const total = totalEntregas(row);
                  const score = calcScoreEdicao(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                      <TableCell className="text-center">{total}</TableCell>
                      <TableCell className="text-center">{row.correcoes}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{score}</TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Tabela: Distribuição de Entregas */}
          <p className="text-sm font-medium pt-2">Distribuição de Entregas por Destino</p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-center">Conteúdo</TableHead>
                  <TableHead className="text-center">Start</TableHead>
                  <TableHead className="text-center">Latam</TableHead>
                  <TableHead className="text-center">Marketing</TableHead>
                  <TableHead className="text-center">Outras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const total = totalEntregas(row);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                      <TableCell className="text-center">{pct(row.entregasConteudo, total)}</TableCell>
                      <TableCell className="text-center">{pct(row.entregasStart, total)}</TableCell>
                      <TableCell className="text-center">{pct(row.entregasLatam, total)}</TableCell>
                      <TableCell className="text-center">{pct(row.entregasMarketing, total)}</TableCell>
                      <TableCell className="text-center">{pct(row.entregasOutras, total)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <EdicaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
