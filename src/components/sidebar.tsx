"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House, BarChart2, Key, LogOut, Gauge, Users, Bot,
  GitBranch, BookOpen, ChevronLeft, ChevronRight, Menu, X, Receipt, FileBarChart, TrendingUp, BookMarked, Sun, Moon, ClipboardList, Settings, Pencil, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileDialog } from "@/components/profile-dialog";
import { useTheme } from "next-themes";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isAdmin: boolean;
}

type NavChild = { href: string; label: string };

type NavItem =
  | { href: string; label: string; icon: React.ElementType; children?: never }
  | { href?: never; label: string; icon: React.ElementType; children: NavChild[] };

// Itens principais — Dashboard e Usuários ficam sempre no final via bottomItems
const mainNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/kpis", label: "KPIs", icon: TrendingUp },
  { href: "/publicacoes", label: "Publicações", icon: BookMarked },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  {
    label: "Produção de Conteúdo",
    icon: Pencil,
    children: [
      { href: "/producao-conteudo/briefing", label: "Briefing para Marketing" },
      { href: "/producao-conteudo/validacao-ementa", label: "Validação de Ementa" },
      { href: "/producao-conteudo/revisao-didatica", label: "Revisão Didática" },
      { href: "/producao-conteudo/pesquisa-mercado", label: "Pesquisa de Mercado" },
      { href: "/producao-conteudo/plano-estudos", label: "Plano de Estudos" },
    ],
  },
  { href: "/processos", label: "Processos & Fluxos", icon: GitBranch },
  { href: "/documentacoes", label: "Documentações", icon: BookOpen },
  { href: "/automacoes", label: "Automações & Agentes", icon: Bot },
  { href: "/licencas", label: "Licenças", icon: Key },
];

const bottomNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
];

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());

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

  // Abre automaticamente o submenu que contém a rota ativa
  useEffect(() => {
    mainNavItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setOpenSubmenus((prev) => new Set(prev).add(item.label));
      }
    });
  }, [pathname]);

  const toggleSubmenu = (label: string) => {
    // Se a sidebar estiver colapsada, expande primeiro
    if (collapsed) setCollapsed(false);
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const allBottomNav = [
    ...bottomNavItems,
    ...(isAdmin
      ? [
          { href: "/gastos", label: "Gastos Externos", icon: Receipt },
          { href: "/imobilizacao", label: "Imobilização", icon: ClipboardList },
          { href: "/admin/usuarios", label: "Usuários", icon: Users },
          { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
        ]
      : []),
  ];

  const navLink = (item: NavItem) => {
    const Icon = item.icon;

    // Item com submenu
    if (item.children) {
      const isOpen = openSubmenus.has(item.label);
      const isAnyChildActive = item.children.some((child) => pathname.startsWith(child.href));

      return (
        <div key={item.label}>
          <button
            onClick={() => toggleSubmenu(item.label)}
            title={collapsed ? item.label : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              collapsed && "justify-center px-2",
              isAnyChildActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">{item.label}</span>
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
                />
              </>
            )}
          </button>

          {!collapsed && isOpen && (
            <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l pl-3">
              {item.children.map((child) => {
                const isActive = pathname.startsWith(child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Item simples
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

  // Versão do navLink para o drawer mobile (sempre expandido, suporta submenu)
  const mobileNavLink = (item: NavItem) => {
    const Icon = item.icon;

    if (item.children) {
      const isOpen = openSubmenus.has(item.label);
      const isAnyChildActive = item.children.some((child) => pathname.startsWith(child.href));

      return (
        <div key={item.label}>
          <button
            onClick={() => toggleSubmenu(item.label)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isAnyChildActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={18} className="shrink-0" />
            <span className="truncate flex-1 text-left">{item.label}</span>
            <ChevronDown
              size={14}
              className={cn("shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </button>

          {isOpen && (
            <div className="ml-3 mt-1 mb-1 space-y-0.5 border-l pl-3">
              {item.children.map((child) => {
                const isActive = pathname.startsWith(child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center px-3 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

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
            <button
              className="flex items-center gap-3 mb-3 w-full rounded-md p-1 hover:bg-muted transition-colors text-left"
              onClick={() => setProfileOpen(true)}
              title="Editar perfil"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback>
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </button>
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
            <button
              title="Editar perfil"
              onClick={() => setProfileOpen(true)}
              className="rounded-full"
            >
              <Avatar className="h-8 w-8">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback>
                  {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
            <button
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Sun size={16} className="dark:hidden" />
              <Moon size={16} className="hidden dark:block" />
            </button>
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
                {mainNavItems.map(mobileNavLink)}
              </nav>
              <div className="p-2 space-y-1 border-t">
                {allBottomNav.map(mobileNavLink)}
              </div>
              <div className="p-3 border-t">
                <button
                  className="flex items-center gap-3 mb-3 w-full rounded-md p-1 hover:bg-muted transition-colors text-left"
                  onClick={() => { setMobileOpen(false); setProfileOpen(true); }}
                  title="Editar perfil"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                    <AvatarFallback>
                      {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </button>
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

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        isAdmin={isAdmin}
      />
    </>
  );
}
