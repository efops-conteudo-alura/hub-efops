"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, X, Loader2 } from "lucide-react";
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

export function NodeLinkDialog({ open, nodeId, links, onClose, onSave }: Props) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [localLinks, setLocalLinks] = useState<NodeLink[]>(links);

  useEffect(() => {
    setLocalLinks(links);
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
    const exists = localLinks.find((l) => l.targetId === automation.id);
    if (exists) {
      setLocalLinks(localLinks.filter((l) => l.targetId !== automation.id));
    } else {
      setLocalLinks([...localLinks, { type: "AUTOMATION", targetId: automation.id, targetTitle: automation.name }]);
    }
  }

  function handleSave() {
    if (nodeId) onSave(nodeId, localLinks);
    onClose();
  }

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Ativo", INACTIVE: "Inativo", TESTING: "Testando",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Automações linkadas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {localLinks.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Links ativos</p>
              {localLinks.map((link) => (
                <div key={link.targetId} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5">
                  <span className="truncate">{link.targetTitle}</span>
                  <button onClick={() => setLocalLinks(localLinks.filter((l) => l.targetId !== link.targetId))}>
                    <X size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Selecionar automação</p>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
            ) : automations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhuma automação cadastrada.</p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {automations.map((a) => {
                  const linked = !!localLinks.find((l) => l.targetId === a.id);
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
                        <Badge variant="outline" className="text-xs">{a.type === "AGENT" ? "Agente" : "Automação"}</Badge>
                        {linked && <Zap size={12} className="text-amber-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
