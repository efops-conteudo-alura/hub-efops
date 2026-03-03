"use client";

import { Extension, type Editor } from "@tiptap/core";
import type { Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  Type, Heading1, Heading2, List, ListOrdered,
  Quote, Code2, Table as TableIcon, Minus,
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { createPortal } from "react-dom";

type CommandItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  command: (props: { editor: Editor; range: Range }) => void;
};

const COMMANDS: CommandItem[] = [
  {
    title: "Texto",
    description: "Parágrafo normal",
    icon: Type,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Título 1",
    description: "Seção principal",
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: "Título 2",
    description: "Subseção",
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: "Lista",
    description: "Lista com marcadores",
    icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Lista numerada",
    description: "Lista ordenada",
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Citação",
    description: "Bloco de citação",
    icon: Quote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: "Código",
    description: "Bloco de código",
    icon: Code2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    title: "Tabela",
    description: "Inserir tabela 3×3",
    icon: TableIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Divisor",
    description: "Linha horizontal",
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  clientRect?: (() => DOMRect | null) | null;
}

interface CommandListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command, clientRect }, ref) => {
    const [selected, setSelected] = useState(0);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useEffect(() => {
      setSelected(0);
    }, [items]);

    useEffect(() => {
      const r = clientRect?.();
      if (!r) return;
      setPos({
        top: r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - 272),
      });
    }, [clientRect, items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selected]) command(items[selected]);
          return true;
        }
        return false;
      },
    }));

    if (!pos || items.length === 0) return null;

    return createPortal(
      <div
        className="fixed z-50 w-64 rounded-lg border border-border bg-popover shadow-lg overflow-hidden py-1"
        style={{ top: pos.top, left: pos.left }}
      >
        <p className="text-[10px] text-muted-foreground px-3 py-1 uppercase tracking-wide font-medium">
          Blocos de conteúdo
        </p>
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => command(item)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left ${
              i === selected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50 text-foreground"
            }`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded border border-border bg-background shrink-0">
              <item.icon size={14} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm leading-tight">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>,
      document.body
    );
  }
);

CommandList.displayName = "CommandList";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: CommandItem;
        }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) =>
          COMMANDS.filter(
            (c) =>
              c.title.toLowerCase().includes(query.toLowerCase()) ||
              c.description.toLowerCase().includes(query.toLowerCase())
          ),
        render: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let renderer: ReactRenderer<CommandListRef, any>;

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              renderer = new ReactRenderer(CommandList, {
                props: {
                  items: props.items,
                  command: (item: CommandItem) => props.command(item),
                  clientRect: props.clientRect,
                },
                editor: props.editor,
              });
            },
            onUpdate: (props: SuggestionProps<CommandItem>) => {
              renderer.updateProps({
                items: props.items,
                command: (item: CommandItem) => props.command(item),
                clientRect: props.clientRect,
              });
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                renderer.destroy();
                return true;
              }
              return renderer.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              renderer.destroy();
            },
          };
        },
      } as Partial<SuggestionOptions<CommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
