"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House, BarChart2, Key, LogOut,
  Menu, X, FileBarChart, TrendingUp, BookMarked,
  Settings, Pencil, ChevronRight, ChevronLeft, Archive, Wallet,
  FolderKanban, Zap, GitBranch, FileText, Sparkles,
  DollarSign, Timer, Users, Server,
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

type NavChild = { href: string; label: string; icon: React.ElementType };

type NavItem =
  | { href: string; label: string; icon: React.ElementType; children?: never }
  | { href?: never; label: string; icon: React.ElementType; children: NavChild[] };

const mainNavItems: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/kpis", label: "KPIs", icon: TrendingUp },
  { href: "/publicacoes", label: "Publicações", icon: BookMarked },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/briefing", label: "Briefing", icon: Pencil },
  {
    label: "Acervo",
    icon: Archive,
    children: [
      { href: "/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/automacoes", label: "Automações", icon: Zap },
      { href: "/processos", label: "Processos", icon: GitBranch },
      { href: "/documentacoes", label: "Docs", icon: FileText },
      { href: "/biblioteca-de-prompts", label: "Prompts", icon: Sparkles },
    ],
  },
  { href: "/licencas", label: "Licenças", icon: Key },
];

const bottomNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
];

function RootItem({
  item,
  pathname,
  onEnterGroup,
}: {
  item: NavItem;
  pathname: string;
  onEnterGroup: (group: NavItem) => void;
}) {
  const Icon = item.icon;

  if (item.children) {
    const isActive = item.children.some((c) => pathname.startsWith(c.href));
    return (
      <button
        onClick={() => onEnterGroup(item)}
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md transition-colors text-left",
          isActive
            ? "bg-muted text-foreground"
            : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
        <span className="flex-1 text-sm font-medium leading-none">{item.label}</span>
        <ChevronRight size={13} className="shrink-0 opacity-40" />
      </button>
    );
  }

  const isActive = pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
      <span className="text-sm font-medium leading-none">{item.label}</span>
    </Link>
  );
}

function SubmenuChild({ child, pathname }: { child: NavChild; pathname: string }) {
  const isActive = pathname.startsWith(child.href);
  const Icon = child.icon;
  return (
    <Link
      href={child.href}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md transition-colors text-sm leading-none",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
      {child.label}
    </Link>
  );
}

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<NavItem | null>(null);

  const adminItems: NavItem[] = isAdmin
    ? [
        {
          label: "Gestão",
          icon: Wallet,
          children: [
            { href: "/gastos", label: "Gastos com externos", icon: DollarSign },
            { href: "/imobilizacao", label: "Imobilização", icon: Timer },
          ],
        },
        {
          label: "Configurações",
          icon: Settings,
          children: [
            { href: "/admin/usuarios", label: "Usuários", icon: Users },
            { href: "/admin/configuracoes", label: "Sistema", icon: Server },
          ],
        },
      ]
    : [];

  const allItems = [...mainNavItems, ...bottomNavItems, ...adminItems];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Entra automaticamente no submenu correto ao navegar direto para uma rota filha
  useEffect(() => {
    const match = allItems.find(
      (item) => item.children?.some((child) => pathname.startsWith(child.href))
    );
    setActiveGroup(match ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const inSubmenu = activeGroup !== null;

  const rootPanel = (
    <div className="w-1/2 h-full flex flex-col">
      <nav className="flex-1 flex flex-col py-3 gap-0.5 px-2 overflow-y-auto">
        {mainNavItems.map((item) => (
          <RootItem
            key={item.label}
            item={item}
            pathname={pathname}
            onEnterGroup={setActiveGroup}
          />
        ))}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border px-2 py-2 flex flex-col gap-0.5">
        {[...bottomNavItems, ...adminItems].map((item) => (
          <RootItem
            key={item.label}
            item={item}
            pathname={pathname}
            onEnterGroup={setActiveGroup}
          />
        ))}
      </div>
    </div>
  );

  const submenuPanel = (
    <div className="w-1/2 h-full flex flex-col">
      {activeGroup && (
        <>
          <div className="shrink-0 border-b border-sidebar-border px-2 py-3">
            <button
              onClick={() => setActiveGroup(null)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors w-full"
            >
              <ChevronLeft size={15} className="shrink-0" />
              <span>{activeGroup.label}</span>
            </button>
          </div>
          <nav className="flex-1 flex flex-col py-2 gap-0.5 px-2 overflow-y-auto">
            {(activeGroup.children ?? []).map((child) => (
              <SubmenuChild key={child.href} child={child} pathname={pathname} />
            ))}
          </nav>
        </>
      )}
    </div>
  );

  const sidebarInner = (
    <>
      {/* Painéis deslizantes */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: "200%",
            transform: inSubmenu ? "translateX(-50%)" : "translateX(0%)",
            transition: "transform 220ms ease-in-out",
          }}
        >
          {rootPanel}
          {submenuPanel}
        </div>
      </div>

      {/* Usuário — sempre visível */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3 flex items-center justify-between">
        <button
          onClick={() => setProfileOpen(true)}
          title={user.name ?? "Editar perfil"}
          className="rounded-full hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-7 w-7">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback className="text-xs bg-sidebar-accent text-foreground">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </button>
        <button
          title="Sair"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Hambúrguer mobile */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-sidebar border border-sidebar-border shadow-sm"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-[200px] shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
        <div className="flex flex-col justify-center py-4 px-4 border-b border-sidebar-border shrink-0 gap-0.5">
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
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-[200px] border-r border-sidebar-border bg-sidebar">
            <div className="flex flex-col justify-center py-4 px-4 border-b border-sidebar-border shrink-0 gap-0.5 relative">
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
        canChangePassword={true}
      />
    </>
  );
}
