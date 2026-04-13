"use client";

import { useCallback, useRef, useState, useEffect, memo } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  Handle, Position, type Connection, type Node, type Edge, type NodeProps, type EdgeProps,
  Panel, BackgroundVariant, MarkerType, BaseEdge, EdgeLabelRenderer, getBezierPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, Type, Server, Database, Globe, Box, Cpu, Shield, Layers, Upload, X, Circle } from "lucide-react";
import { parseMdToArchitecture } from "./md-parser";

/*
  Standard flowchart shapes (from SmartDraw/Miro/Creately):
  - rectangle:  Process / action step
  - rounded:    Start / End (terminal)
  - diamond:    Decision point
  - parallelogram: Input / Output (data)
  - cylinder:   Database / data store
  - circle:     Connector / junction
  - subroutine: Predefined process (double-bordered rect)
  - hexagon:    Preparation / setup step
*/

const SHAPES = [
  { id: "rectangle", label: "Process", desc: "Action or operation" },
  { id: "rounded", label: "Terminal", desc: "Start or end point" },
  { id: "diamond", label: "Decision", desc: "Yes/No branch" },
  { id: "parallelogram", label: "Data", desc: "Input or output" },
  { id: "cylinder", label: "Database", desc: "Data storage" },
  { id: "circle", label: "Connector", desc: "Junction point" },
  { id: "subroutine", label: "Subroutine", desc: "Predefined process" },
  { id: "hexagon", label: "Preparation", desc: "Setup step" },
];

const NODE_DEFS = [
  { type: "textBlock", label: "Text Block", icon: Type, accent: "#888", defaultShape: "rectangle" },
  { type: "service", label: "Service", icon: Server, accent: "#3B82F6", defaultShape: "rounded" },
  { type: "database", label: "Database", icon: Database, accent: "#22C55E", defaultShape: "cylinder" },
  { type: "api", label: "API Endpoint", icon: Globe, accent: "#F59E0B", defaultShape: "hexagon" },
  { type: "component", label: "Component", icon: Box, accent: "#8B5CF6", defaultShape: "subroutine" },
  { type: "processor", label: "Processor", icon: Cpu, accent: "#EC4899", defaultShape: "parallelogram" },
  { type: "auth", label: "Auth / Security", icon: Shield, accent: "#EF4444", defaultShape: "diamond" },
  { type: "layer", label: "Layer / Group", icon: Layers, accent: "#06B6D4", defaultShape: "rounded" },
];

// SVG shape renderer — text always fits inside
function ShapeSVG({ shape, accent, selected, width, height }: { shape: string; accent: string; selected: boolean; width: number; height: number }) {
  const stroke = selected ? "rgba(255,255,255,0.25)" : accent + "50";
  const fill = selected ? "#1e1e1e" : "#141414";
  const sw = 1.5;

  switch (shape) {
    case "rounded":
      return <rect x={sw} y={sw} width={width - sw * 2} height={height - sw * 2} rx={height / 2} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "diamond":
      return <polygon points={`${width / 2},${sw} ${width - sw},${height / 2} ${width / 2},${height - sw} ${sw},${height / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "parallelogram": {
      const skew = 14;
      return <polygon points={`${skew},${sw} ${width - sw},${sw} ${width - skew},${height - sw} ${sw},${height - sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    case "cylinder":
      const ry = 8;
      return (
        <>
          <path d={`M${sw},${ry + sw} L${sw},${height - ry - sw} Q${sw},${height - sw} ${width / 2},${height - sw} Q${width - sw},${height - sw} ${width - sw},${height - ry - sw} L${width - sw},${ry + sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={width / 2} cy={ry + sw} rx={width / 2 - sw} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} />
        </>
      );
    case "circle":
      const r = Math.min(width, height) / 2 - sw;
      return <circle cx={width / 2} cy={height / 2} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "subroutine": {
      const inset = 6;
      return (
        <>
          <rect x={sw} y={sw} width={width - sw * 2} height={height - sw * 2} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
          <line x1={inset} y1={sw} x2={inset} y2={height - sw} stroke={stroke} strokeWidth={sw} />
          <line x1={width - inset} y1={sw} x2={width - inset} y2={height - sw} stroke={stroke} strokeWidth={sw} />
        </>
      );
    }
    case "hexagon": {
      const indent = 16;
      return <polygon points={`${indent},${sw} ${width - indent},${sw} ${width - sw},${height / 2} ${width - indent},${height - sw} ${indent},${height - sw} ${sw},${height / 2}`} fill={fill} stroke={stroke} strokeWidth={sw} />;
    }
    default: // rectangle
      return <rect x={sw} y={sw} width={width - sw * 2} height={height - sw * 2} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
}

const CustomNode = memo(({ data, selected }: NodeProps) => {
  const def = NODE_DEFS.find((d) => d.type === data.nodeType) ?? NODE_DEFS[0];
  const Icon = def.icon;
  const shape = (data.shape as string) ?? def.defaultShape;
  const isDiamond = shape === "diamond";
  const isCircle = shape === "circle";
  const w = isDiamond ? 120 : isCircle ? 80 : 160;
  const h = isDiamond ? 80 : isCircle ? 80 : data.description ? 56 : 42;

  return (
    <div style={{ width: w, height: h, position: "relative" }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <ShapeSVG shape={shape} accent={def.accent} selected={!!selected} width={w} height={h} />
      </svg>

      <Handle type="target" position={Position.Top} isConnectable style={{ width: 8, height: 8, background: def.accent, border: "2px solid #0d0d0d", borderRadius: "50%", top: -4, zIndex: 20 }} />

      <div style={{
        position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100%", padding: isDiamond ? "4px 8px" : isCircle ? "4px" : "6px 12px", textAlign: "center", overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
          <Icon style={{ width: 11, height: 11, color: def.accent, flexShrink: 0 }} />
          <span style={{ fontSize: isDiamond || isCircle ? 10 : 11, fontWeight: 500, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isDiamond ? 70 : isCircle ? 50 : 120 }}>
            {data.label as string}
          </span>
        </div>
        {(data.description as string) && !isDiamond && !isCircle && (
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
            {data.description as string}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable style={{ width: 8, height: 8, background: def.accent, border: "2px solid #0d0d0d", borderRadius: "50%", bottom: -4, zIndex: 20 }} />
      <Handle type="source" position={Position.Right} id="right" isConnectable style={{ width: 8, height: 8, background: def.accent, border: "2px solid #0d0d0d", borderRadius: "50%", right: -4, zIndex: 20 }} />
      <Handle type="target" position={Position.Left} id="left" isConnectable style={{ width: 8, height: 8, background: def.accent, border: "2px solid #0d0d0d", borderRadius: "50%", left: -4, zIndex: 20 }} />
    </div>
  );
});
CustomNode.displayName = "CustomNode";

const nodeTypes = Object.fromEntries(NODE_DEFS.map((d) => [d.type, CustomNode]));

// Custom edge with hover X button
function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const showDelete = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setHovered(true);
  };
  const scheduleHide = () => {
    hideTimeout.current = setTimeout(() => setHovered(false), 300);
  };

  return (
    <>
      {/* Wide invisible hit area — stable hover zone */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={30} onMouseEnter={showDelete} onMouseLeave={scheduleHide} style={{ cursor: "pointer" }} />
      {/* Visible edge */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: hovered ? "rgba(255,255,255,0.3)" : (style?.stroke ?? "rgba(255,255,255,0.12)"), strokeWidth: hovered ? 2 : (style?.strokeWidth ?? 1.5), transition: "stroke 150ms, stroke-width 150ms" }} />
      {hovered && (
        <EdgeLabelRenderer>
          <button
            onMouseEnter={showDelete}
            onMouseLeave={scheduleHide}
            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("canvas:delete-edge", { detail: { id } })); }}
            style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all", width: 20, height: 20, borderRadius: "50%", background: "#EF4444", border: "2px solid #0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
            className="nodrag nopan"
          >
            <X style={{ width: 10, height: 10, color: "#fff" }} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { default: DeletableEdge };

interface CanvasEditorProps { initialData: string; onSave: (data: string) => void; planId?: string; socket?: any; currentUser?: { id: string; name: string }; }

export function CanvasEditor({ initialData, onSave, planId, socket, currentUser }: CanvasEditorProps) {
  const parsed = (() => { try { const d = JSON.parse(initialData); return { nodes: d.nodes ?? [], edges: d.edges ?? [] }; } catch { return { nodes: [], edges: [] }; } })();

  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges);
  const [showToolbar, setShowToolbar] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeUsers, setActiveUsers] = useState<{ userId: string; userName: string }[]>([]);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket || !planId || !currentUser) return;
    socket.emit("canvas:join", { planId, userId: currentUser.id, userName: currentUser.name });
    const onUsers = ({ users }: any) => { const u = users.filter((x: any, i: number, a: any[]) => a.findIndex((y: any) => y.userId === x.userId) === i); setActiveUsers(u); };
    const onJoined = (user: any) => setActiveUsers((p) => p.some((u: any) => u.userId === user.userId) ? p : [...p, user]);
    const onLeft = ({ userId }: any) => setActiveUsers((p) => p.filter((u: any) => u.userId !== userId));
    const onSync = ({ nodes: n, edges: e }: any) => { setNodes(n); setEdges(e); };
    socket.on("canvas:users", onUsers); socket.on("canvas:user:joined", onJoined); socket.on("canvas:user:left", onLeft); socket.on("canvas:nodes:sync", onSync);
    return () => { socket.emit("canvas:leave", { planId }); socket.off("canvas:users", onUsers); socket.off("canvas:user:joined", onJoined); socket.off("canvas:user:left", onLeft); socket.off("canvas:nodes:sync", onSync); };
  }, [socket, planId, currentUser, setNodes, setEdges]);

  const debouncedSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => { onSave(JSON.stringify({ nodes: n, edges: e })); if (socket && planId) socket.emit("canvas:nodes:update", { planId, nodes: n, edges: e }); }, 1500);
  }, [onSave, socket, planId]);

  // Listen for edge delete from custom edge X button
  useEffect(() => {
    const handler = (e: Event) => {
      const edgeId = (e as CustomEvent).detail?.id;
      if (!edgeId) return;
      setEdges((eds) => {
        const updated = eds.filter((ed) => ed.id !== edgeId);
        setNodes((nds) => { debouncedSave(nds, updated); return nds; });
        return updated;
      });
    };
    window.addEventListener("canvas:delete-edge", handler);
    return () => window.removeEventListener("canvas:delete-edge", handler);
  }, [setEdges, setNodes, debouncedSave]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => { const ne = addEdge({ ...params, style: { stroke: "rgba(255,255,255,0.12)", strokeWidth: 1.5 }, animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "rgba(255,255,255,0.2)" } }, eds); setNodes((nds) => { debouncedSave(nds, ne); return nds; }); return ne; });
  }, [setEdges, setNodes, debouncedSave]);

  const handleNodesChange = useCallback((changes: any) => { onNodesChange(changes); setTimeout(() => { setNodes((n) => { setEdges((e) => { debouncedSave(n, e); return e; }); return n; }); }, 0); }, [onNodesChange, setNodes, setEdges, debouncedSave]);

  const addNode = (ti: number) => {
    const def = NODE_DEFS[ti];
    setNodes((nds) => { const u = [...nds, { id: `node-${Date.now()}`, type: def.type, position: { x: 200 + Math.random() * 400, y: 100 + Math.random() * 300 }, data: { label: def.label, nodeType: def.type, description: "", shape: def.defaultShape } }]; debouncedSave(u, edges); return u; });
    setShowToolbar(false);
  };

  const deleteSelected = useCallback(() => { setNodes((nds) => { const k = nds.filter((n) => !n.selected); setEdges((eds) => { const ke = eds.filter((e) => !e.selected && k.some((n) => n.id === e.source) && k.some((n) => n.id === e.target)); debouncedSave(k, ke); return ke; }); return k; }); setSelectedNode(null); }, [setNodes, setEdges, debouncedSave]);

  const handleMdUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { const t = ev.target?.result as string; if (!t) return; const { nodes: n, edges: ed } = parseMdToArchitecture(t); setNodes(n); setEdges(ed); debouncedSave(n, ed); }; r.readAsText(f); e.target.value = ""; }, [setNodes, setEdges, debouncedSave]);

  const onNodeClick = useCallback((_: any, node: Node) => { setSelectedNode(node); }, []);

  const updateSelectedNode = (field: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) => { const u = nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, [field]: value } } : n); setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } }); debouncedSave(u, edges); return u; });
  };

  return (
    <div className="w-full h-full relative">
      <style>{`
        .react-flow { --xy-node-boxshadow-hover-default: none; --xy-node-boxshadow-selected-default: none; --xy-edge-stroke-default: rgba(255,255,255,0.1); --xy-connectionline-stroke-default: rgba(255,255,255,0.2); --xy-controls-button-background-color-default: #1a1a1a; --xy-controls-button-background-color-hover-default: #222; --xy-controls-button-color-default: rgba(255,255,255,0.5); --xy-controls-button-border-color-default: rgba(255,255,255,0.06); }
        .react-flow__node { background: none !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
        .react-flow__controls { border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); }
      `}</style>
      <ReactFlow
        nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView colorMode="dark" onNodeClick={onNodeClick} onPaneClick={() => setSelectedNode(null)}
        connectionMode={"loose" as any}
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{ style: { stroke: "rgba(255,255,255,0.1)", strokeWidth: 1.5 }, animated: true, markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "rgba(255,255,255,0.2)" } }}
        proOptions={{ hideAttribution: true }} style={{ background: "#0d0d0d" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.03)" />
        <Controls showInteractive={false} />
        <MiniMap style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }} nodeColor={(n) => NODE_DEFS.find((d) => d.type === n.type)?.accent ?? "#444"} maskColor="rgba(0,0,0,0.7)" />

        <Panel position="top-left">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowToolbar(!showToolbar)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#1a1a1a] border border-white/[0.06] hover:bg-[#222] text-[12px] font-medium text-foreground/60 transition-colors duration-150"><Plus className="w-3.5 h-3.5" /> Add Node</button>
            <button onClick={deleteSelected} className="h-8 px-2.5 rounded-lg bg-[#1a1a1a] border border-white/[0.06] hover:bg-[#222] text-foreground/50 hover:text-red-400/70 transition-colors duration-150"><Trash2 className="w-3.5 h-3.5" /></button>
            <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#1a1a1a] border border-white/[0.06] hover:bg-[#222] text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors duration-150 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import MD
              <input type="file" accept=".md,.txt" onChange={handleMdUpload} className="hidden" />
            </label>
          </div>
          {showToolbar && (
            <div className="mt-2 p-1.5 rounded-xl bg-[#161616] border border-white/[0.08] space-y-0.5 min-w-[180px] shadow-xl shadow-black/40">
              {NODE_DEFS.map((d, i) => (
                <button key={d.type} onClick={() => addNode(i)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-foreground/50 hover:text-foreground/80 hover:bg-white/[0.04] transition-colors duration-150">
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: d.accent, flexShrink: 0 }} />
                  <d.icon className="w-3.5 h-3.5" style={{ color: d.accent }} />
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </Panel>

        {activeUsers.length > 0 && (
          <Panel position="top-right">
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-white/[0.06] rounded-lg px-2 py-1.5">
              {activeUsers.slice(0, 5).map((u) => (
                <div key={u.userId} title={u.userName} className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[9px] font-medium text-foreground/50">
                  {u.userName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
              ))}
              <span className="text-[10px] text-foreground/40 ml-1.5">{activeUsers.length === 1 ? "Just you" : `${activeUsers.length} editing`}</span>
            </div>
          </Panel>
        )}

        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="text-center mt-40">
              <Layers className="w-8 h-8 mx-auto mb-3 text-foreground/10" />
              <p className="text-[14px] text-foreground/45">Add nodes to build your architecture</p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Detail panel */}
      {selectedNode && (
        <div className="absolute top-2 right-2 w-[240px] bg-[#161616] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-50">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground/40">Node Details</span>
            <button onClick={() => setSelectedNode(null)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/[0.06] text-foreground/40"><X className="w-3 h-3" /></button>
          </div>
          <div className="p-3 space-y-2.5">
            <div>
              <label className="text-[10px] text-foreground/40 mb-1 block">Label</label>
              <input value={(selectedNode.data.label as string) ?? ""} onChange={(e) => updateSelectedNode("label", e.target.value)} className="w-full h-7 px-2 rounded-md border border-white/[0.06] bg-white/[0.02] text-[11px] text-foreground/70 focus:outline-none focus:border-white/[0.12]" />
            </div>
            <div>
              <label className="text-[10px] text-foreground/40 mb-1 block">Description</label>
              <textarea value={(selectedNode.data.description as string) ?? ""} onChange={(e) => updateSelectedNode("description", e.target.value)} className="w-full px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] text-[10px] text-foreground/50 focus:outline-none focus:border-white/[0.12] resize-none min-h-[48px] leading-relaxed" placeholder="Details..." />
            </div>
            <div>
              <label className="text-[10px] text-foreground/40 mb-1.5 block">Shape</label>
              <div className="grid grid-cols-4 gap-1">
                {SHAPES.map((s) => (
                  <button key={s.id} onClick={() => updateSelectedNode("shape", s.id)} title={`${s.label}: ${s.desc}`} className={`h-6 rounded text-[9px] font-medium transition-colors duration-150 ${((selectedNode.data.shape as string) ?? NODE_DEFS.find(d => d.type === selectedNode.data.nodeType)?.defaultShape) === s.id ? "bg-white/[0.12] text-foreground/70" : "bg-white/[0.03] text-foreground/40 hover:text-foreground/40"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
