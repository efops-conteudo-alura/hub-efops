import React from "react";

function parseInline(text: string): React.ReactNode {
  // Processa **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold mt-6 mb-2 first:mt-0 text-foreground border-b pb-1">
          {parseInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold mt-4 mb-1 text-foreground">
          {parseInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-muted-foreground/30 pl-3 my-1 text-muted-foreground text-sm italic">
          {parseInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith("-[") || (line.startsWith("-") && line[1] !== "-" && !line.startsWith("---"))) {
      // Módulo na sugestão de ementa: -[Nome] ou - item
      const text = line.startsWith("-[") ? line.slice(1) : line.slice(1).trimStart();
      elements.push(
        <p key={i} className="font-semibold text-sm mt-4 mb-1 text-foreground">
          {parseInline(text)}
        </p>
      );
    } else if (line.startsWith("*") && !line.startsWith("**")) {
      // Vídeo na sugestão: *[Titulo]
      const text = line.slice(1).trimStart();
      elements.push(
        <p key={i} className="text-sm pl-3 text-muted-foreground leading-snug">
          · {parseInline(text)}
        </p>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="my-4 border-border" />);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  });

  return <div className={className}>{elements}</div>;
}
