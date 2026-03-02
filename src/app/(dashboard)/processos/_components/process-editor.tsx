"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type Node, type Edge, useNodesState, useEdgesState } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Globe, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { FlowCanvas } from "./flow-canvas";
import { RichTextEditor } from "./rich-text-editor";
import { NodeLinkDialog } from "./node-link-dialog";
import type { NodeLink } from "./nodes/process-node";

interface ProcessData {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  flowData?: string | null;
  richText?: string | null;
}

interface Props {
  initialData?: ProcessData;
}

function parseFlowData(raw?: string | null): { nodes: Node[]; edges: Edge[] } {
  if (!raw) return { nodes: [], edges: [] };
  try { return JSON.parse(raw); } catch { return { nodes: [], edges: [] }; }
}

function parseRichText(raw?: string | null): object | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function ProcessEditorInner({ initialData }: Props) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const parsed = parseFlowData(initialData?.flowData);
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [richTextContent, setRichTextContent] = useState<object | null>(parseRichText(initialData?.richText));

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkNodeId, setLinkNodeId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNodesEdgesChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  const handleOpenLinks = useCallback((nodeId: string) => {
    setLinkNodeId(nodeId);
    setLinkDialogOpen(true);
  }, []);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) { setTags(tags.filter((t) => t !== tag)); }

  function getLinksForNode(nodeId: string): NodeLink[] {
    const node = nodes.find((n) => n.id === nodeId);
    return (node?.data as { links?: NodeLink[] })?.links ?? [];
  }

  function handleSaveLinks(nodeId: string, links: NodeLink[]) {
    setNodes((ns) => ns.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, links } } : n
    ));
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    if (!title.trim()) { setError("O título é obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        title,
        tags,
        status,
        flowData: JSON.stringify({ nodes, edges }),
        richText: richTextContent ? JSON.stringify(richTextContent) : null,
      };

      let res: Response;
      if (isEditing) {
        res = await fetch(`/api/processos/${initialData!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/processos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar");

      router.push(`/processos/${json.id}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-card flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/processos"><ArrowLeft size={16} className="mr-1" /> Voltar</Link>
        </Button>
        <Input
          className="flex-1 min-w-[200px] text-base font-medium border-0 shadow-none focus-visible:ring-0 px-0"
          placeholder="Título do processo..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex items-center gap-1 flex-wrap">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1">
              {tag}
              <button onClick={() => removeTag(tag)}><X size={10} /></button>
            </Badge>
          ))}
          <div className="flex gap-1">
            <Input
              className="h-7 w-24 text-xs"
              placeholder="+ Tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            />
          </div>
        </div>
        <div className="flex gap-2 ml-auto shrink-0">
          {error && <p className="text-xs text-destructive self-center">{error}</p>}
          <Button variant="outline" size="sm" onClick={() => save("DRAFT")} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
            Rascunho
          </Button>
          <Button size="sm" onClick={() => save("PUBLISHED")} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Globe size={14} className="mr-1" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesEdgesChange={handleNodesEdgesChange}
          onOpenLinks={handleOpenLinks}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Documentação</p>
          <RichTextEditor
            content={richTextContent}
            onChange={setRichTextContent}
            editable={true}
          />
        </div>
      </div>

      <NodeLinkDialog
        open={linkDialogOpen}
        nodeId={linkNodeId}
        links={linkNodeId ? getLinksForNode(linkNodeId) : []}
        onClose={() => setLinkDialogOpen(false)}
        onSave={handleSaveLinks}
      />
    </div>
  );
}

export function ProcessEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <ProcessEditorInner {...props} />
    </ReactFlowProvider>
  );
}
