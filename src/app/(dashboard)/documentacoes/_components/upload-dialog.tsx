"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DocUploadDialog({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleClose = useCallback(() => {
    // Cancela o pedido em curso, se houver
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setFile(null);
    setError(null);
    onClose();
  }, [onClose]);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout de 30 s
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documentacoes/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Lê a resposta como texto primeiro — garante que funciona mesmo se o
      // servidor retornar HTML de erro 500 em vez de JSON
      const text = await res.text();
      let data: { error?: string; id?: string } = {};
      try { data = JSON.parse(text); } catch { /* corpo não é JSON */ }

      if (!res.ok) {
        setError(data.error ?? `Erro ao processar o arquivo (HTTP ${res.status})`);
        return;
      }

      if (!data.id) {
        setError("Resposta inválida do servidor.");
        return;
      }

      handleClose();
      router.push(`/documentacoes/${data.id}/editar`);
    } catch (err) {
      clearTimeout(timeout);
      if ((err as Error).name === "AbortError") {
        setError("Importação cancelada.");
      } else {
        setError("Não foi possível conectar ao servidor.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={16} /> Importar arquivo .docx
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          O conteúdo do arquivo será importado e você poderá editar antes de publicar.
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"
          }`}
          onClick={() => !loading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
            disabled={loading}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm">
              <FileText size={16} className="text-primary" />
              <span className="font-medium truncate max-w-[200px]">{file.name}</span>
            </div>
          ) : (
            <div className="space-y-1">
              <Upload size={20} className="mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo <strong>.docx</strong></p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            {loading ? <><X size={14} className="mr-1" /> Cancelar</> : "Cancelar"}
          </Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> Importando...</> : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
