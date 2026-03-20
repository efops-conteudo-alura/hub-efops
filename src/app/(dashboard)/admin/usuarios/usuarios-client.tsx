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
  isSuperAdmin: boolean;
}

export function UsuariosClient({ initialUsers, isSuperAdmin }: UsuariosClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<Tab>("usuarios");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  function handleSaved(updated: { id: string; name: string; email: string; role: string }) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updated.id
          ? {
              ...u,
              name: updated.name,
              role: updated.role,
              appRoles: u.appRoles.map((r) =>
                r.app === "hub-efops" ? { ...r, role: updated.role } : r
              ),
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
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            {users.length} {users.length === 1 ? "usuário" : "usuários"} cadastrados
          </p>
        </div>
        {activeTab === "usuarios" && <CreateUserDialog onCreated={() => router.refresh()} />}
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Hub EfOps</TableHead>
                <TableHead>Outros apps</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const otherApps = u.appRoles.filter((r) => r.app !== "hub-efops");
                return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.appRoles.some((r) => r.app === "hub-efops") ? (
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {u.role === "ADMIN" ? "Admin" : "Usuário"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {otherApps.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {otherApps.map((r) => (
                          <Badge key={r.app} variant="outline" className="text-xs">
                            {r.app}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(u)}
                        >
                          <Pencil size={13} />
                        </Button>
                      )}
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
              );
              })}
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
