"use client";

import { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { FlowNodeData } from "./process-node";

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
      className={`relative min-w-[120px] min-h-[48px] px-4 py-3 border-2 bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-center cursor-default select-none ${
        selected ? "border-purple-500 shadow-md" : "border-purple-300 dark:border-purple-700"
      }`}
      style={{ borderRadius: "12px" }}
    >
      <Handle type="source" position={Position.Top} id="t" className="!w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="!w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="l" className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="r" className="!w-2 !h-2" />

      {editing ? (
        <input
          autoFocus
          className="bg-transparent text-sm text-center outline-none w-full"
          value={nodeData.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
        />
      ) : (
        <span
          className="text-sm font-medium text-purple-900 dark:text-purple-100 leading-snug"
          onDoubleClick={() => setEditing(true)}
        >
          {nodeData.label || "Evento / Trigger"}
        </span>
      )}

      <button
        className={`absolute -top-2.5 -right-2.5 rounded-full p-0.5 shadow z-10 transition-colors ${
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
