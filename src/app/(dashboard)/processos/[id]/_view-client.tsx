"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type Node, type Edge, MarkerType } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Zap, Bot, Link as LinkIcon, ExternalLink } from "lucide-react";
import { FlowCanvas, useNodesState, useEdgesState } from "../_components/flow-canvas";
import { RichTextEditor } from "../_components/rich-text-editor";
import type { NodeLink } from "../_components/nodes/process-node";

interface Props {
  processId: string;
  flowData?: string | null;
  richText?: string | null;
  showContent?: boolean;
}

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

function NodeLinksDialog({ nodeId, nodes, open, onClose }: {
  nodeId: string | null;
  nodes: Node[];
  open: boolean;
  onClose: () => void;
}) {
  if (!nodeId) return null;
  const node = nodes.find(n => n.id === nodeId);
  const links: NodeLink[] = (node?.data as { links?: NodeLink[] })?.links ?? [];
  const label = (node?.data as { label?: string })?.label || "Nó";

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
          <div className="space-y-2 mt-1">
            {links.map((link, i) => {
              if (link.type === "URL") {
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LinkIcon size={14} className="text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{link.title}</span>
                      <Badge variant="outline" className="text-xs shrink-0">URL</Badge>
                    </div>
                    <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                  </a>
                );
              }

              const isAgent = link.automationType === "AGENT";
              return (
                <a
                  key={i}
                  href={`/automacoes`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isAgent
                      ? <Bot size={14} className="text-amber-500 shrink-0" />
                      : <Zap size={14} className="text-amber-500 shrink-0" />}
                    <span className="text-sm truncate">{link.targetTitle}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {isAgent ? "Agente" : "Automação"}
                    </Badge>
                  </div>
                  <ExternalLink size={12} className="text-muted-foreground shrink-0" />
                </a>
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
