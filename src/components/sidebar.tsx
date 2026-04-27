"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  House, BarChart2, Key, LogOut,
  FileBarChart, TrendingUp, BookMarked,
  Settings, Pencil, Archive, Wallet,
  FolderKanban, Zap, GitBranch, FileText, Sparkles,
  DollarSign, Timer, Users, Server, ChevronDown, ChevronRight,
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
  { href: "/home", label: "Início", icon: House },
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

function NavGroup({
  item,
  pathname,
  defaultOpen,
}: {
  item: NavItem & { children: NavChild[] };
  pathname: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = item.icon;
  const isActive = item.children.some((c) => pathname.startsWith(c.href));

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-3 rounded-[8px] transition-colors text-left",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
        <span className={cn("flex-1 text-sm leading-tight", isActive ? "font-semibold" : "font-normal")}>
          {item.label}
        </span>
        {open
          ? <ChevronDown size={14} className="shrink-0 opacity-50" />
          : <ChevronRight size={14} className="shrink-0 opacity-50" />
        }
      </button>
      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-3">
          {item.children.map((child) => {
            const childActive = pathname.startsWith(child.href);
            const ChildIcon = child.icon;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2.5 rounded-[8px] transition-colors text-sm leading-tight",
                  childActive
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-normal"
                )}
              >
                <ChildIcon size={16} strokeWidth={childActive ? 2 : 1.5} className="shrink-0" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 w-full px-3 py-3 rounded-[8px] transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
      <span className={cn("text-sm leading-tight", isActive ? "font-semibold" : "font-normal")}>
        {label}
      </span>
    </Link>
  );
}

function NavItems({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        if (item.children) {
          const isOpen = item.children.some((c) => pathname.startsWith(c.href));
          return (
            <NavGroup key={item.label} item={item} pathname={pathname} defaultOpen={isOpen} />
          );
        }
        return <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />;
      })}
    </>
  );
}

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);

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

  const initials =
    user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";

  return (
    <aside className="flex flex-col w-[256px] shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      {/* Logo */}
      <div className="flex flex-col items-start px-5 pt-7 pb-6 shrink-0">
        <Image
          src="/alura-logo.svg"
          alt="Alura"
          width={107}
          height={32}
          className="[filter:brightness(0)_invert(1)] opacity-90"
          priority
        />
        <span className="text-[13px] font-medium text-muted-foreground tracking-widest uppercase mt-2">
          Hub EfOps
        </span>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 flex flex-col px-3 overflow-hidden">
        {/* Itens principais — crescem e scrollam se necessário */}
        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto pb-2">
          <NavItems items={mainNavItems} pathname={pathname} />
        </div>

        {/* Itens admin — ancorados no fundo, acima do perfil */}
        {(bottomNavItems.length > 0 || adminItems.length > 0) && (
          <>
            <div className="border-t-2 border-muted-foreground/30 my-2" />
            <div className="flex flex-col gap-0.5 pb-2">
              <NavItems items={[...bottomNavItems, ...adminItems]} pathname={pathname} />
            </div>
          </>
        )}
      </nav>

      {/* Usuário + Logout */}
      <div className="shrink-0 border-t border-muted-foreground/30 px-3 py-3 flex flex-col gap-1">
        <button
          onClick={() => setProfileOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-3 rounded-[8px] hover:bg-muted/50 transition-colors cursor-pointer"
          title="Editar perfil"
        >
          <Avatar className="h-5 w-5 shrink-0">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback className="text-[9px] bg-sidebar-accent text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-normal text-muted-foreground leading-tight truncate">
            {user.name || user.email}
          </span>
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full px-3 py-3 rounded-[8px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <LogOut size={20} strokeWidth={1.5} className="shrink-0" />
          <span className="text-sm font-normal leading-tight">Sair</span>
        </button>
      </div>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        user={user}
        canChangePassword={true}
      />
    </aside>
  );
}
