"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const APP_CONFIG: Record<string, { label: string; roles: { value: string; label: string }[] }> = {
  "hub-efops": {
    label: "Hub EfOps",
    roles: [
      { value: "USER", label: "Usuário" },
      { value: "ADMIN", label: "Admin" },
    ],
  },
  "hub-producao-conteudo": {
    label: "Hub Produção",
    roles: [
      { value: "USER", label: "Usuário" },
      { value: "COORDINATOR", label: "Coordenador" },
      { value: "INSTRUCTOR", label: "Instrutor" },
      { value: "ADMIN", label: "Admin" },
    ],
  },
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
}

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: { id: string; name: string; email: string; appRoles: AppRoleEntry[] }) => void;
}

export function EditUserDialog({ user, open, onOpenChange, onSaved }: EditUserDialogProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [password, setPassword] = useState("");
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync state when user changes
  if (user && name !== user.name && !loading) {
    setName(user.name);
    setPassword("");
    setError("");
    const map: Record<string, string> = {};
    for (const app of Object.keys(APP_CONFIG)) map[app] = "__none__";
    for (const r of user.appRoles) map[r.app] = r.role;
    setRoleMap(map);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    // Só envia apps com role definido (não "Sem acesso")
    const appRoles = Object.entries(roleMap)
      .filter(([, role]) => role !== "__none__")
      .map(([app, role]) => ({ app, role }));

    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password: password || undefined, appRoles }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      return;
    }

    onSaved({ id: user.id, name: data.name, email: data.email, appRoles: data.appRoles });
    onOpenChange(false);
    setPassword("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">{user?.email}</p>

          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Acesso por aplicativo</Label>
            {Object.entries(APP_CONFIG).map(([app, config]) => {
              const currentRole = roleMap[app] ?? "__none__";
              return (
                <div key={app} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-32 shrink-0">
                    {config.label}
                  </span>
                  <Select
                    value={currentRole}
                    onValueChange={(v) => setRoleMap((prev) => ({ ...prev, [app]: v }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sem acesso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem acesso</SelectItem>
                      {config.roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-password">
              Nova senha{" "}
              <span className="text-muted-foreground font-normal">(deixe em branco para manter)</span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={password ? 8 : undefined}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
