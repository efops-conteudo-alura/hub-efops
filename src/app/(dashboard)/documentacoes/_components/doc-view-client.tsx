"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

interface Props {
  docId: string;
  content?: string | null;
  canEdit: boolean;
}

function parseContent(raw?: string | null): object | string | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function ViewEditor({ content }: { content: object | string | null }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: true }),
    ],
    content: content ?? undefined,
    editable: false,
    editorProps: {
      attributes: { class: "tiptap-content p-0 text-sm" },
    },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

export function DocViewClient({ docId, content, canEdit }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const parsedContent = parseContent(content);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/documentacoes/${docId}`, { method: "DELETE" });
    router.push("/documentacoes");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => router.push(`/documentacoes/${docId}/editar`)}>
            <Pencil size={13} className="mr-1" /> Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={13} className="mr-1" /> Excluir
          </Button>
        </div>
      )}

      {parsedContent ? (
        <ViewEditor content={parsedContent} />
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Esta documentação ainda não tem conteúdo.</p>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir documentação?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
