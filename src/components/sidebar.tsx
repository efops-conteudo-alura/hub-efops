"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House, BarChart2, Key, LogOut, Users,
  Menu, X, Receipt, FileBarChart, TrendingUp, BookMarked,
  ClipboardList, Settings, Pencil, ChevronDown, Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileDialog } from "@/components/profile-dialog";

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

const mainNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/kpis", label: "KPIs", icon: TrendingUp },
  { href: "/publicacoes", label: "Publicações", icon: BookMarked },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  {
    label: "Produção",
    icon: Pencil,
    children: [
      { href: "/producao-conteudo/briefing", label: "Briefing" },
      { href: "/producao-conteudo/validacao-ementa", label: "Validação" },
      { href: "/producao-conteudo/revisao-didatica", label: "Revisão" },
      { href: "/producao-conteudo/pesquisa-mercado", label: "Pesquisa" },
      { href: "/producao-conteudo/plano-estudos", label: "Plano" },
    ],
  },
  {
    label: "Acervo",
    icon: Archive,
    children: [
      { href: "/projetos", label: "Projetos" },
      { href: "/automacoes", label: "Automações" },
      { href: "/processos", label: "Processos" },
      { href: "/documentacoes", label: "Docs" },
      { href: "/biblioteca-de-prompts", label: "Prompts" },
    ],
  },
  { href: "/licencas", label: "Licenças", icon: Key },
];

const bottomNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
];

function NavItemEl({
  item,
  pathname,
  openSubmenus,
  onToggleSubmenu,
}: {
  item: NavItem;
  pathname: string;
  openSubmenus: Set<string>;
  onToggleSubmenu: (label: string) => void;
}) {
  const Icon = item.icon;

  if (item.children) {
    const isOpen = openSubmenus.has(item.label);
    const isAnyChildActive = item.children.some((child) =>
      pathname.startsWith(child.href)
    );

    return (
      <div className="w-full">
        <button
          onClick={() => onToggleSubmenu(item.label)}
          title={item.label}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 w-full py-3 px-2 rounded-xl transition-colors",
            isAnyChildActive
              ? "bg-sidebar-accent text-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
          )}
        >
          <Icon size={20} strokeWidth={isAnyChildActive ? 2 : 1.5} />
          <span className="text-[11px] font-semibold leading-tight text-center">
            {item.label}
          </span>
          <ChevronDown
            size={10}
            className={cn(
              "transition-transform duration-200 opacity-50",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="mt-1 mb-1 space-y-0.5 px-1">
            {item.children.map((child) => {
              const isActive = pathname.startsWith(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  title={child.label}
                  className={cn(
                    "block text-center px-2 py-1.5 rounded-lg text-xs font-medium transition-colors truncate",
                    isActive
                      ? "bg-sidebar-accent text-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
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
      href={item.href}
      title={item.label}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 w-full py-3 px-2 rounded-xl transition-colors",
        isActive
          ? "bg-sidebar-accent text-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
      <span className="text-[11px] font-semibold leading-tight text-center">
        {item.label}
      </span>
    </Link>
  );
}

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    mainNavItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setOpenSubmenus((prev) => new Set(prev).add(item.label));
      }
    });
  }, [pathname]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const allBottomNav: NavItem[] = [
    ...bottomNavItems,
    ...(isAdmin
      ? [
          { href: "/gastos", label: "Gastos", icon: Receipt },
          { href: "/imobilizacao", label: "Imobil.", icon: ClipboardList },
          { href: "/admin/usuarios", label: "Usuários", icon: Users },
          { href: "/admin/configuracoes", label: "Config.", icon: Settings },
        ]
      : []),
  ];

  const navProps = { pathname, openSubmenus, onToggleSubmenu: toggleSubmenu };

  const sidebarInner = (
    <>
      {/* Nav principal */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 px-2 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavItemEl key={item.label} item={item} {...navProps} />
        ))}
      </nav>

      {/* Nav rodapé (Dashboard + admin) */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2 flex flex-col gap-1">
        {allBottomNav.map((item) => (
          <NavItemEl key={item.href ?? item.label} item={item} {...navProps} />
        ))}
      </div>

      {/* Usuário + ações */}
      <div className="shrink-0 border-t border-sidebar-border px-2 py-3 flex flex-col items-center gap-1">
        <button
          onClick={() => setProfileOpen(true)}
          title={user.name ?? "Editar perfil"}
          className="rounded-full mb-1 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-8 w-8">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback className="text-xs bg-sidebar-accent text-foreground">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>

<button
          title="Sair"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-col items-center gap-1 w-full py-2 px-2 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
        >
          <LogOut size={18} strokeWidth={1.5} />
          <span className="text-[11px] font-semibold">Sair</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Botão hambúrguer — apenas mobile */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-sidebar border border-sidebar-border shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-[148px] shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
        <div className="flex flex-col items-center justify-center py-5 px-3 border-b border-sidebar-border shrink-0 gap-0.5">
          <span className="text-sm font-bold text-foreground leading-none">EFops</span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Hub</span>
        </div>
        {sidebarInner}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-[148px] border-r border-sidebar-border bg-sidebar">
            <div className="flex flex-col items-center justify-center py-5 px-3 border-b border-sidebar-border shrink-0 gap-0.5 relative">
              <span className="text-sm font-bold text-foreground leading-none">EFops</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Hub</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-2 p-1 rounded-md text-muted-foreground hover:bg-sidebar-accent/50"
              >
                <X size={14} />
              </button>
            </div>
            {sidebarInner}
          </aside>
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
