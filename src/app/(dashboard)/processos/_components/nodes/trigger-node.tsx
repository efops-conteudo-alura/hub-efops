"use client";

import { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Zap, Bot, Link as LinkIcon } from "lucide-react";
import type { FlowNodeData, NodeLink } from "./process-node";

function NodeBadge({ links, nodeId, onOpenLinks }: { links: NodeLink[]; nodeId: string; onOpenLinks?: (id: string) => void }) {
  const hasLinks = links?.length > 0;
  const isAgent = links?.some(l => l.type === "AUTOMATION" && l.automationType === "AGENT");
  const isUrl = !isAgent && links?.every(l => l.type === "URL");
  const Icon = isAgent ? Bot : isUrl ? LinkIcon : Zap;

  return (
    <button
      className={`absolute -top-2.5 -right-2.5 rounded-full p-0.5 shadow z-10 transition-colors ${
        hasLinks ? "bg-amber-400 hover:bg-amber-500" : "bg-muted border border-border hover:bg-accent"
      }`}
      title={hasLinks ? "Ver links" : "Adicionar link"}
      onClick={(e) => { e.stopPropagation(); onOpenLinks?.(nodeId); }}
    >
      <Icon size={10} className={hasLinks ? "text-white" : "text-muted-foreground"} />
    </button>
  );
}

export function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);

  const handleLabelChange = useCallback(
    (val: string) => updateNodeData(id, { ...nodeData, label: val }),
    [id, nodeData, updateNodeData]
  );

  return (
    <div
      className={`relative min-w-[120px] min-h-[48px] px-4 py-3 flex items-center justify-center text-center cursor-default select-none bg-purple-500 text-white ${
        selected ? "ring-2 ring-purple-300 ring-offset-1" : ""
      }`}
      style={{ borderRadius: "12px" }}
    >
      <Handle type="source" position={Position.Top} id="t" className="!w-2 !h-2 !bg-purple-200" />
      <Handle type="source" position={Position.Bottom} id="b" className="!w-2 !h-2 !bg-purple-200" />
      <Handle type="source" position={Position.Left} id="l" className="!w-2 !h-2 !bg-purple-200" />
      <Handle type="source" position={Position.Right} id="r" className="!w-2 !h-2 !bg-purple-200" />

      {editing ? (
        <input
          autoFocus
          className="bg-transparent text-sm text-center outline-none w-full text-white"
          value={nodeData.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        />
      ) : (
        <span
          className="text-sm font-medium leading-snug"
          onDoubleClick={() => setEditing(true)}
        >
          {nodeData.label || "Evento / Trigger"}
        </span>
      )}

      <NodeBadge links={nodeData.links ?? []} nodeId={id} onOpenLinks={nodeData.onOpenLinks} />
    </div>
  );
}
