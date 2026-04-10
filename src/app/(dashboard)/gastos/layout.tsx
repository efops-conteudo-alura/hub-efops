"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function GastosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cc = searchParams.get("cc");

  const tabs = [
    { href: "/gastos", label: "Visão Geral" },
    { href: "/gastos/categorias", label: "Por Categoria" },
    { href: "/gastos/prestadores", label: "Por Prestador" },
  ];

  const title =
    cc === "ALURA" ? "Gastos Externos Alura" :
    cc === "LATAM" ? "Gastos Externos LATAM" :
    "Gastos Externos";

  function setFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("cc", value);
    } else {
      params.delete("cc");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  const filterOptions = [
    { label: "Alura", value: "ALURA" },
    { label: "LATAM", value: "LATAM" },
    { label: "Ambos", value: null },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Filtro Alura/LATAM */}
      <div className="flex items-center gap-2 mb-4">
        {filterOptions.map((opt) => {
          const isActive = cc === opt.value || (opt.value === null && !cc);
          return (
            <button
              key={opt.label}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "px-3 py-1 text-xs font-mono font-semibold uppercase rounded border transition-colors",
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="mb-6">
        <h1 className="hub-page-title">{title}</h1>
        <p className="text-muted-foreground mt-1">Instrutores, editores e prestadores de serviço.</p>
      </div>

      <div className="flex mb-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={{ pathname: tab.href, query: cc ? { cc } : {} }}
              className={cn(
                "px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative",
                isActive
                  ? "bg-card text-foreground border-t-foreground z-10"
                  : "bg-sidebar text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
