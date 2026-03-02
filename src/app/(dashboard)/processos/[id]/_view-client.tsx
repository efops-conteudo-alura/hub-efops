"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type Node, type Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { FlowCanvas, useNodesState, useEdgesState } from "../_components/flow-canvas";
import { RichTextEditor } from "../_components/rich-text-editor";

interface Props {
  processId: string;
  flowData?: string | null;
  richText?: string | null;
  showContent?: boolean;
}

function parseFlowData(raw?: string | null): { nodes: Node[]; edges: Edge[] } {
  if (!raw) return { nodes: [], edges: [] };
  try { return JSON.parse(raw); } catch { return { nodes: [], edges: [] }; }
}

function parseRichText(raw?: string | null): object | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function ViewContent({ flowData, richText }: { flowData?: string | null; richText?: string | null }) {
  const parsed = parseFlowData(flowData);
  const [nodes, , onNodesChange] = useNodesState(parsed.nodes);
  const [edges, , onEdgesChange] = useEdgesState(parsed.edges);
  const richTextContent = parseRichText(richText);

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
          onOpenLinks={() => {}}
          readOnly
        />
      )}
      {richTextContent && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Documentação</p>
          <RichTextEditor content={richTextContent} editable={false} />
        </div>
      )}
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
