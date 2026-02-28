"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House, BarChart2, Key, LogOut, Gauge, Users, Bot,
  GitBranch, BookOpen, ChevronLeft, ChevronRight, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  isAdmin: boolean;
}

// Itens principais — Dashboard e Usuários ficam sempre no final via bottomItems
const mainNavItems = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/assinaturas", label: "Licenças", icon: Key },
  { href: "/automacoes", label: "Automações & Agentes", icon: Bot },
  { href: "/processos", label: "Processos & Fluxos", icon: GitBranch },
  { href: "/documentacoes", label: "Documentações", icon: BookOpen },
];

const bottomNavItems = [
  { href: "/analytics", label: "Dashboard", icon: BarChart2 },
];

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Colapsa por padrão no mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fecha o drawer mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const allBottomNav = [
    ...bottomNavItems,
    ...(isAdmin ? [{ href: "/admin/usuarios", label: "Usuários", icon: Users }] : []),
  ];

  const navLink = (item: { href: string; label: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    const isActive = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          collapsed && "justify-center px-2",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-card border-r transition-all duration-200", collapsed ? "w-16" : "w-64")}>
      {/* Header */}
      <div className={cn("p-4 border-b flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Gauge size={20} className="text-primary shrink-0" />
            <h1 className="font-bold text-lg truncate">EFops Hub</h1>
          </div>
        )}
        {collapsed && <Gauge size={20} className="text-primary" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 hidden md:flex"
          title={collapsed ? "Expandir sidebar" : "Retrair sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {mainNavItems.map(navLink)}
      </nav>

      {/* Nav secundária (Dashboard + Usuários sempre por último) */}
      <div className="p-2 space-y-1 border-t">
        {allBottomNav.map(navLink)}
      </div>

      {/* Footer do usuário */}
      <div className={cn("p-3 border-t", collapsed && "flex flex-col items-center gap-2")}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={16} className="mr-2" />
              Sair
            </Button>
          </>
        ) : (
          <>
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <ThemeToggle />
            <button
              title="Sair"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Botão hambúrguer — apenas mobile */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar desktop */}
      <div className="hidden md:flex h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 flex">
            {/* força expanded no drawer mobile */}
            <div className="flex flex-col h-full bg-card border-r w-64">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={20} className="text-primary shrink-0" />
                  <h1 className="font-bold text-lg">EFops Hub</h1>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-2 space-y-1 border-t">
                {allBottomNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="p-3 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut size={16} className="mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
