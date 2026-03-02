"use client";

import { useCallback, useRef } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Connection, type Edge, type Node,
  type NodeTypes, type OnNodesChange, type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ProcessNode } from "./nodes/process-node";
import { DecisionNode } from "./nodes/decision-node";
import { TerminalNode } from "./nodes/terminal-node";
import { TriggerNode } from "./nodes/trigger-node";

const nodeTypes: NodeTypes = {
  processNode: ProcessNode,
  decisionNode: DecisionNode,
  terminalNode: TerminalNode,
  triggerNode: TriggerNode,
};

const TOOLBAR_ITEMS = [
  { type: "processNode", label: "Processo", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { type: "decisionNode", label: "Decisão", color: "bg-amber-100 border-amber-300 text-amber-800" },
  { type: "terminalNode", label: "Início/Fim", color: "bg-green-100 border-green-300 text-green-800", rounded: true },
  { type: "triggerNode", label: "Evento", color: "bg-purple-100 border-purple-300 text-purple-800", radius: "12px" },
];

let nodeIdCounter = 1;
function genId() { return `node_${Date.now()}_${nodeIdCounter++}`; }

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesEdgesChange: (nodes: Node[], edges: Edge[]) => void;
  onOpenLinks: (nodeId: string) => void;
  readOnly?: boolean;
}

export function FlowCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange, onNodesEdgesChange,
  onOpenLinks, readOnly = false,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Injecta onOpenLinks no data de cada nó
  const nodesWithCallback = nodes.map((n) => ({
    ...n,
    data: { ...n.data, onOpenLinks },
  }));

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge({ ...connection, type: "smoothstep", animated: false }, edges);
      onNodesEdgesChange(nodes, newEdges);
    },
    [edges, nodes, onNodesEdgesChange]
  );

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow-nodetype");
    if (!type || !reactFlowWrapper.current) return;

    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60;
    const y = e.clientY - rect.top - 24;

    const newNode: Node = {
      id: genId(),
      type,
      position: { x, y },
      data: { label: "", links: [] },
    };
    onNodesEdgesChange([...nodes, newNode], edges);
  }

  return (
    <div className="flex flex-col gap-0 border rounded-lg overflow-hidden">
      {!readOnly && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Arrastar para o canvas:</span>
          {TOOLBAR_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("application/reactflow-nodetype", item.type)}
              className={`px-3 py-1 text-xs border rounded cursor-grab active:cursor-grabbing font-medium select-none ${item.color}`}
              style={{ borderRadius: item.radius ?? (item.rounded ? "9999px" : "4px") }}
            >
              {item.label}
            </div>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">Duplo clique no nó para editar · Selecionar + Del para apagar</span>
        </div>
      )}

      <div ref={reactFlowWrapper} style={{ height: 440 }}>
        <ReactFlow
          nodes={nodesWithCallback}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onDrop={readOnly ? undefined : handleDrop}
          onDragOver={readOnly ? undefined : handleDragOver}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Delete"
        >
          <Background />
          <Controls showInteractive={false} />
          {!readOnly && <MiniMap nodeStrokeWidth={2} zoomable pannable />}
        </ReactFlow>
      </div>
    </div>
  );
}

// Hook wrapper para uso externo
export { useNodesState, useEdgesState };
