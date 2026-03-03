"use client";

import { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import type { FlowNodeData, NodeLink } from "./process-node";
import { Zap, Bot, Link as LinkIcon } from "lucide-react";

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

export function DecisionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);

  const handleLabelChange = useCallback(
    (val: string) => updateNodeData(id, { ...nodeData, label: val }),
    [id, nodeData, updateNodeData]
  );

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 90 }}>
      {/* Handles posicionadas nas pontas do losango */}
      <Handle type="source" position={Position.Top} id="t" className="!w-2 !h-2 !bg-amber-200" style={{ top: -4 }} />
      <Handle type="source" position={Position.Bottom} id="b" className="!w-2 !h-2 !bg-amber-200" style={{ bottom: -4 }} />
      <Handle type="source" position={Position.Left} id="l" className="!w-2 !h-2 !bg-amber-200" style={{ left: -4 }} />
      <Handle type="source" position={Position.Right} id="r" className="!w-2 !h-2 !bg-amber-200" style={{ right: -4 }} />

      {/* Losango via clip-path */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          backgroundColor: selected ? "#f59e0b" : "#d97706",
        }}
      />

      {/* Anel de seleção */}
      {selected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            boxShadow: "0 0 0 2px #fde68a",
            outline: "2px solid #fde68a",
          }}
        />
      )}

      {/* Label */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: "70%", textAlign: "center" }}>
        {editing ? (
          <input
            autoFocus
            className="bg-transparent text-xs text-center outline-none text-white w-full"
            value={nodeData.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          />
        ) : (
          <span
            className="text-xs font-semibold text-white leading-tight cursor-default"
            onDoubleClick={() => setEditing(true)}
          >
            {nodeData.label || "Decisão"}
          </span>
        )}
      </div>

      <NodeBadge links={nodeData.links ?? []} nodeId={id} onOpenLinks={nodeData.onOpenLinks} />
    </div>
  );
}
