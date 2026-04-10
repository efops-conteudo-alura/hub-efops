"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { AllowedEmailsTab } from "./allowed-emails-tab";

const APP_LABELS: Record<string, string> = {
  "hub-efops": "Hub EfOps",
  "hub-producao-conteudo": "Hub Produção",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  USER: "Usuário",
  COORDINATOR: "Coordenador",
  INSTRUCTOR: "Instrutor",
};

interface AppRoleEntry {
  app: string;
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  appRoles: AppRoleEntry[];
  createdAt: string;
}

type Tab = "usuarios" | "emails";

interface UsuariosClientProps {
  initialUsers: User[];
}

export function UsuariosClient({ initialUsers }: UsuariosClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<Tab>("usuarios");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Collect all unique apps, hub-efops first then others sorted
  const allApps = Array.from(
    new Set(users.flatMap((u) => u.appRoles.map((r) => r.app)))
  ).sort((a, b) => {
    if (a === "hub-efops") return -1;
    if (b === "hub-efops") return 1;
    return a.localeCompare(b);
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover usuário "${name}"?`)) return;
    const res = await fetch("/api/admin/usuarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  function handleEdit(user: User) {
    setEditUser(user);
    setEditOpen(true);
  }

  function handleSaved(updated: { id: string; name: string; email: string; appRoles: AppRoleEntry[] }) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updated.id
          ? {
              ...u,
              name: updated.name,
              role: updated.appRoles.find((r) => r.app === "hub-efops")?.role ?? u.role,
              appRoles: updated.appRoles,
            }
          : u
      )
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "usuarios", label: "Usuários" },
    { key: "emails", label: "Emails Permitidos" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="hub-page-title">Usuários</h1>
          <p className="hub-section-title">
            {users.length} {users.length === 1 ? "usuário" : "usuários"} cadastrados
          </p>
        </div>
        {activeTab === "usuarios" && <CreateUserDialog onCreated={() => router.refresh()} />}
      </div>

      {/* Tabs */}
      <div className="flex mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative",
              activeTab === tab.key
                ? "bg-card text-foreground border-t-foreground z-10"
                : "bg-sidebar text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "usuarios" && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hub-table-header">Nome</TableHead>
                <TableHead className="hub-table-header">Email</TableHead>
                {allApps.map((app) => (
                  <TableHead key={app} className="hub-table-header">{APP_LABELS[app] ?? app}</TableHead>
                ))}
                <TableHead className="hub-table-header">Criado em</TableHead>
                <TableHead className="hub-table-header w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  {allApps.map((app) => {
                    const appRole = u.appRoles.find((r) => r.app === app);
                    return (
                      <TableCell key={app}>
                        {appRole ? (
                          <Badge
                            variant={appRole.role === "ADMIN" ? "default" : "secondary"}
                            className="font-mono uppercase tracking-wider"
                          >
                            {ROLE_LABELS[appRole.role] ?? appRole.role}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(u)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u.id, u.name)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "emails" && <AllowedEmailsTab />}

      <EditUserDialog
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  );
}
