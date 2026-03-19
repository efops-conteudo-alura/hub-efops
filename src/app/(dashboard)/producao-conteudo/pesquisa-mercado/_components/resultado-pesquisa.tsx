"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  resultado: string;
}

export function ResultadoPesquisa({ resultado }: Props) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-semibold prose-headings:text-foreground
        prose-h1:text-xl prose-h2:text-base prose-h3:text-sm
        prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground
        prose-li:text-sm prose-li:text-foreground
        prose-table:text-sm prose-table:w-full
        prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
        prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
        prose-a:text-primary prose-a:underline
        prose-strong:text-foreground
        prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-3 prose-blockquote:text-muted-foreground
      ">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {resultado}
        </ReactMarkdown>
      </div>
    </div>
  );
}
