"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Key, LogOut, Gauge, Users, Bot, GitBranch, BookOpen } from "lucide-react";
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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assinaturas", label: "Licenças", icon: Key },
  { href: "/automacoes", label: "Automações & Agentes", icon: Bot },
  { href: "/processos", label: "Processos & Fluxos", icon: GitBranch },
  { href: "/documentacoes", label: "Documentações", icon: BookOpen },
];

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card flex flex-col shrink-0">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Gauge size={20} className="text-primary shrink-0" />
          <h1 className="font-bold text-lg">EO Hub</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Eficiência Operacional
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
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
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin/usuarios"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith("/admin/usuarios")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Users size={18} />
            Usuários
          </Link>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.name?.[0]?.toUpperCase() ||
                user.email?.[0]?.toUpperCase() ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
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
  );
}
