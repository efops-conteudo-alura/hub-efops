"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Copy, Check, Download, Trash2, Pencil } from "lucide-react";

interface ReportField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface ReportResponse {
  id: string;
  data: Record<string, string>;
  createdAt: string;
}

interface Props {
  report: {
    id: string;
    title: string;
    objective: string | null;
    fields: ReportField[];
    token: string;
    responses: ReportResponse[];
  };
}

export function ReportView({ report }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Respostas em estado local para edição/exclusão sem recarregar
  const [responses, setResponses] = useState<ReportResponse[]>(report.responses);

  // Estado de edição por linha
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Estado de exclusão por linha
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [confirmRowId, setConfirmRowId] = useState<string | null>(null);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/relatorios/responder/${report.token}`
      : `/relatorios/responder/${report.token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeleteReport() {
    setDeleting(true);
    try {
      await fetch(`/api/relatorios/${report.id}`, { method: "DELETE" });
      router.push("/relatorios");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(r: ReportResponse) {
    setEditingId(r.id);
    setEditValues({ ...r.data });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      await fetch(`/api/relatorios/responses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: editValues }),
      });
      setResponses((prev) =>
        prev.map((r) => r.id === editingId ? { ...r, data: { ...editValues } } : r)
      );
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteRow(id: string) {
    setDeletingRowId(id);
    try {
      await fetch(`/api/relatorios/responses/${id}`, { method: "DELETE" });
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingRowId(null);
      setConfirmRowId(null);
    }
  }

  const editingResponse = responses.find((r) => r.id === editingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          {report.objective && (
            <p className="text-muted-foreground mt-1">{report.objective}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <a href={`/api/relatorios/${report.id}/export`}>
            <Button variant="outline" size="sm">
              <Download size={14} className="mr-1" /> Exportar Excel
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={14} className="mr-1" /> Excluir
          </Button>

          {/* Confirm delete report */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Excluir relatório?</DialogTitle>
                <DialogDescription>
                  Todas as respostas também serão removidas. Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={handleDeleteReport} disabled={deleting}>
                  {deleting ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Link público */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium">Link do formulário</p>
        <p className="text-xs text-muted-foreground">
          Compartilhe este link — qualquer pessoa pode preencher o formulário sem precisar de conta.
        </p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={publicUrl}
            className="text-xs font-mono bg-background"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </Button>
        </div>
      </div>

      {/* Tabela de respostas */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          Respostas ({responses.length})
        </h2>

        {responses.length === 0 ? (
          <div className="border rounded-lg py-12 text-center text-muted-foreground text-sm">
            Nenhuma resposta ainda. Compartilhe o link do formulário para começar a coletar dados.
          </div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.fields.map((f) => (
                    <TableHead key={f.id}>{f.label}</TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap">Respondido em</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((r) => (
                  <TableRow key={r.id}>
                    {report.fields.map((f) => (
                      <TableCell key={f.id}>{r.data[f.id] ?? "—"}</TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmRowId(r.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialog: editar resposta */}
      <Dialog open={!!editingId} onOpenChange={(v) => !v && setEditingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar resposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {report.fields.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={editValues[f.id] ?? ""}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                    rows={2}
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={editValues[f.id] ?? ""}
                    onValueChange={(v) => setEditValues((prev) => ({ ...prev, [f.id]: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={editValues[f.id] ?? ""}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [f.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar exclusão de linha */}
      <Dialog open={!!confirmRowId} onOpenChange={(v) => !v && setConfirmRowId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir resposta?</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmRowId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmRowId && deleteRow(confirmRowId)}
              disabled={!!deletingRowId}
            >
              {deletingRowId ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
