"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DocUploadDialog({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  function handleClose() {
    if (loading) return;
    setFile(null);
    setError(null);
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/documentacoes/upload", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao processar o arquivo");
      return;
    }

    handleClose();
    router.push(`/documentacoes/${data.id}/editar`);
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
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
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
          <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-1" /> Importando...</> : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
