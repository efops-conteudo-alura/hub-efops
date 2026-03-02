"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Table as TableIcon, Link as LinkIcon, Minus, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  content: object | null;
  onChange?: (content: object) => void;
  editable?: boolean;
}

export function RichTextEditor({ content, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: !editable }),
      Placeholder.configure({ placeholder: "Adicione uma descrição detalhada do processo..." }),
    ],
    content: content ?? undefined,
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4",
      },
    },
  });

  if (!editor) return null;

  function setLink() {
    const url = window.prompt("URL do link:");
    if (url === null) return;
    if (url === "") { editor?.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const btn = (active: boolean) =>
    `h-7 w-7 p-0 ${active ? "bg-muted" : ""}`;

  return (
    <div className="border rounded-lg overflow-hidden">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
          <Button variant="ghost" size="icon" className={btn(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()} title="Negrito">
            <Bold size={14} />
          </Button>
          <Button variant="ghost" size="icon" className={btn(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()} title="Itálico">
            <Italic size={14} />
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
            onClick={insertTable} title="Inserir tabela">
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
  );
}
