"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";

interface Props {
  onUploaded: () => void;
}

export function UploadDialog({ onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/gastos/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao importar");
      setResult(json);
      onUploaded();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setResult(null); setError(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload size={15} className="mr-1" /> Upload Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar planilha Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-2">
            <p className="font-medium">Como usar</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Baixe o template Excel abaixo</li>
              <li>Preencha os dados a partir da linha 2 (não mude o cabeçalho)</li>
              <li>Salve o arquivo e faça o upload aqui</li>
            </ol>
            <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
              Cada upload substitui todos os dados importados anteriormente. Entradas manuais e do ClickUp não são afetadas.
            </p>
            <div className="pt-1 space-y-0.5 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">mes:</span> formato AAAA-MM (ex: 2026-01)</p>
              <p><span className="font-medium text-foreground">valor:</span> número puro (ex: 5000)</p>
              <p><span className="font-medium text-foreground">categoria:</span> editor_freelancer, editor_externo ou suporte_educacional</p>
              <p><span className="font-medium text-foreground">descricao:</span> nome do prestador (opcional)</p>
            </div>
            <a href="/api/gastos/upload" className="flex items-center gap-1 text-xs text-muted-foreground hover:underline mt-1">
              <Download size={12} /> Baixar template (.xlsx)
            </a>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors">
            <Upload size={15} />
            {file ? file.name : "Selecionar arquivo Excel (.xlsx)"}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div className="space-y-1">
              <p className="text-sm text-green-600 font-medium">{result.inserted} entradas importadas com sucesso</p>
              {result.errors.length > 0 && (
                <ul className="text-xs text-destructive space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
