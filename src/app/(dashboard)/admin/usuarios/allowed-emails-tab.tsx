"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

interface AllowedEmailEntry {
  id: string;
  email: string;
  createdAt: string;
  hasAccount: boolean;
}

export function AllowedEmailsTab() {
  const [entries, setEntries] = useState<AllowedEmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/allowed-emails");
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!input.trim()) return;
    setAdding(true);
    setFeedback("");

    // Parse: aceita um por linha, separados por vírgula ou espaço
    const emails = input
      .split(/[\n,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    const res = await fetch("/api/admin/allowed-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });
    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setFeedback(data.error ?? "Erro ao adicionar.");
      return;
    }

    setInput("");
    setFeedback(
      data.added > 0
        ? `${data.added} email(s) adicionado(s)${data.alreadyExisted > 0 ? `, ${data.alreadyExisted} já existia(m)` : ""}.`
        : `Todos os emails já estavam na lista.`
    );
    await load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/allowed-emails/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium">Adicionar emails permitidos</p>
        <p className="text-xs text-muted-foreground">
          Cole um ou mais emails (um por linha, separados por vírgula ou espaço).
        </p>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"email1@empresa.com\nemail2@empresa.com"}
          rows={4}
          className="font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleAdd} disabled={adding || !input.trim()}>
            <Plus size={14} className="mr-1" />
            {adding ? "Adicionando..." : "Adicionar"}
          </Button>
          {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Lista de emails permitidos{" "}
          <span className="font-normal text-muted-foreground">({entries.length})</span>
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum email na lista.</p>
        ) : (
          <div className="rounded-md border divide-y">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">{e.email}</span>
                  <Badge variant={e.hasAccount ? "secondary" : "outline"} className="text-xs">
                    {e.hasAccount ? "Tem conta" : "Sem conta"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(e.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
