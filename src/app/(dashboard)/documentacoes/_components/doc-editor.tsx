"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { SlashCommand } from "../../processos/_components/slash-command";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Table as TableIcon, Link as LinkIcon, Minus, Quote,
  Undo2, Redo2, Code, ChevronLeft, Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DocData {
  id?: string;
  title: string;
  description?: string | null;
  content?: string | null;
  tags: string[];
  status: string;
}

interface Props {
  initial?: DocData;
}

function parseContent(raw?: string | null): object | string | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; } // HTML string from .docx import
}

export function DocEditor({ initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedContent = parseContent(initial?.content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "" } } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Escreva algo ou use / para inserir um bloco..." }),
      SlashCommand,
    ],
    content: parsedContent ?? undefined,
    editorProps: {
      attributes: { class: "tiptap-content focus:outline-none min-h-[400px] p-4 text-sm" },
    },
  });

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  const handleSave = useCallback(async (status: "DRAFT" | "PUBLISHED") => {
    if (!title.trim()) return;
    setSaving(true);

    const content = editor ? JSON.stringify(editor.getJSON()) : null;
    const body = { title, description: description || null, content, tags, status };

    const isNew = !initial?.id;
    const url = isNew ? "/api/documentacoes" : `/api/documentacoes/${initial.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/documentacoes/${data.id}`);
      router.refresh();
    }
  }, [editor, title, description, tags, initial, router]);

  const btn = (active: boolean) => `h-7 w-7 p-0 ${active ? "bg-muted" : ""}`;

  function setLink() {
    const url = window.prompt("URL do link:");
    if (url === null) return;
    if (url === "") { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ChevronLeft size={16} className="mr-1" /> Voltar
        </Button>
        <div className="flex-1 min-w-[200px]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da documentação"
            className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSave("DRAFT")} disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving || !title.trim()}>
            {saving ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </div>

      {/* Descrição curta */}
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Breve descrição (opcional)"
        className="text-sm"
      />

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 text-xs">
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
              <X size={10} />
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder="+ Tag"
            className="h-7 text-xs w-24"
          />
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={addTag} disabled={!tagInput.trim()}>
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {/* Editor de texto */}
      <div className="border rounded-lg overflow-hidden">
        {editor && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
            <Button variant="ghost" size="icon" className={btn(false)}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()} title="Desfazer">
              <Undo2 size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(false)}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()} title="Refazer">
              <Redo2 size={14} />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className={btn(editor.isActive("bold"))}
              onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
              <Bold size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("italic"))}
              onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
              <Italic size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("code"))}
              onClick={() => editor.chain().focus().toggleCode().run()} title="Código">
              <Code size={14} />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className={btn(editor.isActive("heading", { level: 1 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Título 1">
              <Heading1 size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("heading", { level: 2 }))}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Título 2">
              <Heading2 size={14} />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className={btn(editor.isActive("bulletList"))}
              onClick={() => editor.chain().focus().toggleBulletList().run()} title="Lista">
              <List size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("orderedList"))}
              onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Lista numerada">
              <ListOrdered size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("blockquote"))}
              onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citação">
              <Quote size={14} />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="ghost" size="icon" className={btn(false)}
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela">
              <TableIcon size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(editor.isActive("link"))}
              onClick={setLink} title="Link">
              <LinkIcon size={14} />
            </Button>
            <Button variant="ghost" size="icon" className={btn(false)}
              onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divisor">
              <Minus size={14} />
            </Button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
