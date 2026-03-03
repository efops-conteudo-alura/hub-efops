"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionUploadDialog({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  function handleClose() {
    if (loading) return;
    setFile(null);
    setResult(null);
    setGlobalError(null);
    onClose();
    if (result?.inserted) router.refresh();
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setGlobalError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/subscriptions/upload", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setGlobalError(data.error ?? "Erro ao processar o arquivo"); return; }
    setResult({ inserted: data.inserted, errors: data.errors ?? [] });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} /> Importar licenças via Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <a
            href="/api/subscriptions/upload"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download size={14} /> Baixar template Excel
          </a>

          {!result && (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] ?? null); setGlobalError(null); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet size={16} className="text-green-600" />
                  <span className="font-medium truncate max-w-[220px]">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <FileSpreadsheet size={20} className="mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo <strong>.xlsx</strong></p>
                </div>
              )}
            </div>
          )}

          {globalError && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <CheckCircle2 size={16} />
                {result.inserted} licença{result.inserted !== 1 ? "s" : ""} importada{result.inserted !== 1 ? "s" : ""} com sucesso
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <AlertCircle size={13} /> {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto pl-4">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || loading}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> Importando...</> : "Importar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
