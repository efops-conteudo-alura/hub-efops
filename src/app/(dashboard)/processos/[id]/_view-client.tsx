"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type Node, type Edge, MarkerType } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Zap, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react";
import { FlowCanvas, useNodesState, useEdgesState } from "../_components/flow-canvas";
import { RichTextEditor } from "../_components/rich-text-editor";
import type { NodeLink } from "../_components/nodes/process-node";

interface Props {
  processId: string;
  flowData?: string | null;
  richText?: string | null;
  showContent?: boolean;
}

interface AutomationData {
  id: string;
  name: string;
  type: string;
  status: string;
  shortDesc?: string | null;
  thumbnailUrl?: string | null;
  creator?: string | null;
  tools: string[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa", INACTIVE: "Inativa", TESTING: "Testando",
};

function parseFlowData(raw?: string | null): { nodes: Node[]; edges: Edge[] } {
  if (!raw) return { nodes: [], edges: [] };
  try {
    const data = JSON.parse(raw);
    const edges = (data.edges ?? []).map((e: Edge) => ({
      ...e,
      markerEnd: e.markerEnd ?? { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    }));
    return { nodes: data.nodes ?? [], edges };
  } catch { return { nodes: [], edges: [] }; }
}

function parseRichText(raw?: string | null): object | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function AutomationCard({ link, data }: { link: NodeLink & { type: "AUTOMATION" }; data?: AutomationData }) {
  return (
    <a
      href={`/automacoes/${link.targetId}`}
      className="block rounded-lg border border-border hover:border-primary/50 transition-colors p-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-xs">
          {data ? STATUS_LABELS[data.status] ?? data.status : "—"}
        </Badge>
      </div>
      <p className="font-semibold text-sm leading-tight line-clamp-1">
        {data?.name ?? link.targetTitle}
      </p>
      {data?.shortDesc && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">
          {data.shortDesc}
        </p>
      )}
      {data?.tools && data.tools.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {data.tools.slice(0, 2).map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
          {data.tools.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{data.tools.length - 2}</Badge>
          )}
        </div>
      )}
    </a>
  );
}

function NodeLinksDialog({ nodeId, nodes, open, onClose }: {
  nodeId: string | null;
  nodes: Node[];
  open: boolean;
  onClose: () => void;
}) {
  const [automationData, setAutomationData] = useState<Record<string, AutomationData>>({});
  const [loading, setLoading] = useState(false);

  const node = nodeId ? nodes.find(n => n.id === nodeId) : null;
  const links: NodeLink[] = (node?.data as { links?: NodeLink[] })?.links ?? [];
  const label = (node?.data as { label?: string })?.label || "Nó";

  // Busca dados de automações ao abrir
  useEffect(() => {
    if (!open || !links.length) return;
    const automationLinks = links.filter(l => l.type === "AUTOMATION");
    if (!automationLinks.length) return;

    setLoading(true);
    Promise.all(
      automationLinks.map(l =>
        fetch(`/api/automacoes/${l.targetId}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, AutomationData> = {};
      results.forEach((r, i) => {
        if (r) map[(automationLinks[i] as { targetId: string }).targetId] = r;
      });
      setAutomationData(map);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId]);

  if (!nodeId) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Links — {label}
          </DialogTitle>
        </DialogHeader>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum link cadastrado para este nó.</p>
        ) : (
          <div className="space-y-3 mt-1">
            {loading && (
              <div className="flex justify-center py-2">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {links.map((link, i) => {
              if (link.type === "URL") {
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon size={14} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-muted-foreground shrink-0" />
                  </a>
                );
              }

              return (
                <AutomationCard
                  key={i}
                  link={link}
                  data={automationData[link.targetId]}
                />
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewContent({ flowData, richText }: { flowData?: string | null; richText?: string | null }) {
  const parsed = parseFlowData(flowData);
  const [nodes, , onNodesChange] = useNodesState(parsed.nodes);
  const [edges, , onEdgesChange] = useEdgesState(parsed.edges);
  const richTextContent = parseRichText(richText);
  const [linkNodeId, setLinkNodeId] = useState<string | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  function handleOpenLinks(nodeId: string) {
    setLinkNodeId(nodeId);
    setLinkDialogOpen(true);
  }

  if (nodes.length === 0 && !richText) {
    return <p className="text-sm text-muted-foreground text-center py-12">Este processo ainda não tem conteúdo.</p>;
  }

  return (
    <div className="space-y-6">
      {nodes.length > 0 && (
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesEdgesChange={() => {}}
          onOpenLinks={handleOpenLinks}
          readOnly
        />
      )}
      {richTextContent && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Documentação</p>
          <RichTextEditor content={richTextContent} editable={false} />
        </div>
      )}

      <NodeLinksDialog
        nodeId={linkNodeId}
        nodes={nodes}
        open={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
      />
    </div>
  );
}

export function ProcessViewClient({ processId, flowData, richText, showContent }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/processos/${processId}`, { method: "DELETE" });
    router.push("/processos");
    router.refresh();
  }

  if (showContent) {
    return (
      <ReactFlowProvider>
        <ViewContent flowData={flowData} richText={richText} />
      </ReactFlowProvider>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 size={13} className="mr-1" /> Excluir
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir processo?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
