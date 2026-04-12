const stack = [
  {
    category: "Framework",
    items: ["Next.js 16", "TypeScript", "React 19"],
  },
  {
    category: "Banco de dados",
    items: ["PostgreSQL", "Neon", "Prisma ORM"],
  },
  {
    category: "Autenticação",
    items: ["NextAuth v4"],
  },
  {
    category: "UI",
    items: ["shadcn/ui", "Tailwind CSS v4", "lucide-react"],
  },
  {
    category: "Formulários",
    items: ["react-hook-form", "zod"],
  },
  {
    category: "IA",
    items: ["Anthropic SDK", "claude-sonnet-4-6", "Web Search"],
  },
  {
    category: "Editor de texto",
    items: ["TipTap"],
  },
  {
    category: "Diagramas",
    items: ["@xyflow/react"],
  },
  {
    category: "Gráficos",
    items: ["Recharts"],
  },
  {
    category: "Importação",
    items: ["mammoth (DOCX)", "xlsx"],
  },
  {
    category: "Deploy",
    items: ["Vercel", "Neon serverless"],
  },
];

export function StackInfo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {stack.map((group) => (
        <div
          key={group.category}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <p className="hub-table-header text-muted-foreground">{group.category}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <span key={item} className="hub-tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
