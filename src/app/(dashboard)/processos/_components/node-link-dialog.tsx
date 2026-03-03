"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Bot, X, Loader2, Link as LinkIcon, Search } from "lucide-react";
import type { NodeLink } from "./nodes/process-node";

interface Automation {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface Props {
  open: boolean;
  nodeId: string | null;
  links: NodeLink[];
  onClose: () => void;
  onSave: (nodeId: string, links: NodeLink[]) => void;
}

type Tab = "automations" | "url";

export function NodeLinkDialog({ open, nodeId, links, onClose, onSave }: Props) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [localLinks, setLocalLinks] = useState<NodeLink[]>(links);
  const [tab, setTab] = useState<Tab>("automations");
  const [search, setSearch] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  useEffect(() => {
    setLocalLinks(links);
    setSearch("");
    setUrlInput("");
    setUrlTitle("");
    setTab("automations");
  }, [links, nodeId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/automacoes")
      .then((r) => r.json())
      .then((data) => setAutomations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [open]);

  function toggleAutomation(automation: Automation) {
    const exists = localLinks.find(
      (l) => l.type === "AUTOMATION" && l.targetId === automation.id
    );
    if (exists) {
      setLocalLinks(localLinks.filter(
        (l) => !(l.type === "AUTOMATION" && l.targetId === automation.id)
      ));
    } else {
      setLocalLinks([
        ...localLinks,
        {
          type: "AUTOMATION",
          targetId: automation.id,
          targetTitle: automation.name,
          automationType: automation.type === "AGENT" ? "AGENT" : "AUTOMATION",
        },
      ]);
    }
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    const title = urlTitle.trim() || url;
    setLocalLinks([...localLinks, { type: "URL", url, title }]);
    setUrlInput("");
    setUrlTitle("");
  }

  function removeLink(index: number) {
    setLocalLinks(localLinks.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (nodeId) onSave(nodeId, localLinks);
    onClose();
  }

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Ativo", INACTIVE: "Inativo", TESTING: "Testando",
  };

  const filtered = automations.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Links do nó
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Links ativos */}
          {localLinks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Links ativos</p>
              {localLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5 gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {link.type === "URL"
                      ? <LinkIcon size={12} className="text-muted-foreground shrink-0" />
                      : link.automationType === "AGENT"
                      ? <Bot size={12} className="text-amber-500 shrink-0" />
                      : <Zap size={12} className="text-amber-500 shrink-0" />
                    }
                    <span className="truncate">
                      {link.type === "URL" ? link.title : link.targetTitle}
                    </span>
                    {link.type === "AUTOMATION" && (
                      <Badge variant="outline" className="text-xs shrink-0">Automação</Badge>
                    )}
                    {link.type === "URL" && (
                      <Badge variant="outline" className="text-xs shrink-0">URL</Badge>
                    )}
                  </div>
                  <button onClick={() => removeLink(i)}>
                    <X size={14} className="text-muted-foreground hover:text-destructive shrink-0" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b">
            <button
              onClick={() => setTab("automations")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                tab === "automations"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Zap size={12} /> Automações / Agentes
              </span>
            </button>
            <button
              onClick={() => setTab("url")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                tab === "url"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <LinkIcon size={12} /> Link externo
              </span>
            </button>
          </div>

          {/* Tab: Automações */}
          {tab === "automations" && (
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs"
                  placeholder="Buscar automação ou agente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  {search ? "Nenhum resultado." : "Nenhuma automação cadastrada."}
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {filtered.map((a) => {
                    const linked = !!localLinks.find(
                      (l) => l.type === "AUTOMATION" && l.targetId === a.id
                    );
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAutomation(a)}
                        className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded border transition-colors ${
                          linked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate text-left">{a.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {a.type === "AGENT" ? "Agente" : "Automação"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                          {linked && <Zap size={12} className="text-amber-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: URL */}
          {tab === "url" && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Input
                  className="h-8 text-xs"
                  placeholder="Título do link (opcional)"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="https://..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrl()}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={addUrl}
                disabled={!urlInput.trim()}
              >
                <LinkIcon size={12} className="mr-1.5" /> Adicionar link
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
