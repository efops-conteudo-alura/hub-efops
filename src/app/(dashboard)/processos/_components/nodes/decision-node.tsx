"use client";

import { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { FlowNodeData } from "./process-node";

export function DecisionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);

  const handleLabelChange = useCallback(
    (val: string) => updateNodeData(id, { ...nodeData, label: val }),
    [id, nodeData, updateNodeData]
  );

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 80 }}>
      <Handle type="source" position={Position.Top} id="t" style={{ top: 0 }} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="b" style={{ bottom: 0 }} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="l" style={{ left: 0 }} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="r" style={{ right: 0 }} className="!w-2 !h-2" />

      <div
        className={`absolute inset-0 rounded border-2 bg-amber-50 dark:bg-amber-950/30 ${
          selected ? "border-amber-500 shadow-md" : "border-amber-300 dark:border-amber-700"
        }`}
        style={{ transform: "rotate(45deg)", transformOrigin: "center" }}
      />

      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {editing ? (
          <input
            autoFocus
            className="bg-transparent text-xs text-center outline-none w-20"
            value={nodeData.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          />
        ) : (
          <span
            className="text-xs font-medium text-amber-900 dark:text-amber-100 text-center px-2 leading-snug"
            onDoubleClick={() => setEditing(true)}
          >
            {nodeData.label || "Decisão"}
          </span>
        )}
      </div>

      <button
        className={`absolute -top-2.5 -right-2.5 rounded-full p-0.5 shadow z-20 transition-colors ${
          nodeData.links?.length > 0
            ? "bg-amber-400 hover:bg-amber-500"
            : "bg-muted border border-border hover:bg-accent"
        }`}
        title={nodeData.links?.length > 0 ? "Ver links" : "Adicionar link"}
        onClick={(e) => { e.stopPropagation(); nodeData.onOpenLinks?.(id); }}
      >
        <Zap size={10} className={nodeData.links?.length > 0 ? "text-white" : "text-muted-foreground"} />
      </button>
    </div>
  );
}
