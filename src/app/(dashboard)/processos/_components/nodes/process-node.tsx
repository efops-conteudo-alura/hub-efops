"use client";

import { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { Zap } from "lucide-react";

export type NodeLink = { type: "AUTOMATION"; targetId: string; targetTitle: string };
export type FlowNodeData = { label: string; links: NodeLink[]; onOpenLinks?: (nodeId: string) => void };

export function ProcessNode({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);

  const handleLabelChange = useCallback(
    (val: string) => updateNodeData(id, { ...nodeData, label: val }),
    [id, nodeData, updateNodeData]
  );

  return (
    <div
      className={`relative min-w-[120px] min-h-[48px] px-4 py-3 rounded-md border-2 bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-center cursor-default select-none ${
        selected ? "border-blue-500 shadow-md" : "border-blue-300 dark:border-blue-700"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />

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
          className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-snug"
          onDoubleClick={() => setEditing(true)}
        >
          {nodeData.label || "Processo"}
        </span>
      )}

      {nodeData.links?.length > 0 && (
        <button
          className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-0.5 shadow z-10"
          title="Ver automações linkadas"
          onClick={(e) => { e.stopPropagation(); nodeData.onOpenLinks?.(id); }}
        >
          <Zap size={10} className="text-white" />
        </button>
      )}
    </div>
  );
}
