"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Copy, Check, Download, Trash2 } from "lucide-react";

interface ReportField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Response {
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
    responses: Response[];
  };
}

export function ReportView({ report }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/relatorios/responder/${report.token}`
      : `/relatorios/responder/${report.token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/relatorios/${report.id}`, { method: "DELETE" });
      router.push("/relatorios");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

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
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
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
          Respostas ({report.responses.length})
        </h2>

        {report.responses.length === 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.responses.map((r) => (
                  <TableRow key={r.id}>
                    {report.fields.map((f) => (
                      <TableCell key={f.id}>{r.data[f.id] ?? "—"}</TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
