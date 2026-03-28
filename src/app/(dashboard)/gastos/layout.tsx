"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function GastosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/gastos", label: "Visão Geral" },
    { href: "/gastos/categorias", label: "Por Categoria" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="hub-page-title">Gastos Externos</h1>
        <p className="text-muted-foreground mt-1">Instrutores, editores e prestadores de serviço.</p>
      </div>

      <div className="flex mb-6">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
