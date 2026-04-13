"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlan, updatePlan, getPlanSections, addPlanSection, updatePlanSection, deletePlanSection, deletePlan } from "../actions";
import { ArrowLeft, Plus, Trash2, Loader2, FileText, GitBranch, Code, ChevronUp, ChevronDown, Eye, EyeOff, Upload, Clipboard, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { useSession } from "@/lib/auth-client";
import { MermaidPreview } from "@/components/planning/mermaid-preview";
import dynamic from "next/dynamic";

const CanvasEditor = dynamic(() => import("@/components/planning/canvas-editor").then(m => m.CanvasEditor), { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div> });

interface Plan { id: string; title: string; type: string; mode: string; canvasData: string; description: string | null; status: string; authorName: string | null; createdAt: Date; updatedAt: Date; }
interface Section { id: string; title: string; content: string; order: number; }

const modes = [
  { key: "text", label: "Document", icon: FileText },
  { key: "canvas", label: "Canvas", icon: GitBranch },
  { key: "diagram", label: "Diagram", icon: Code },
];

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const { socket } = useSocket();
  const { data: session } = useSession();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [mode, setMode] = useState("text");
  const [diagramCode, setDiagramCode] = useState("");
  const [diagramSectionId, setDiagramSectionId] = useState<string | null>(null);
  const [showDiagramCode, setShowDiagramCode] = useState(false);

  useEffect(() => {
    Promise.all([getPlan(planId), getPlanSections(planId)]).then(([p, allSections]) => {
      if (!p) { router.push("/planning"); return; }
      setPlan(p as Plan);

      const secs = (allSections as Section[]).sort((a, b) => a.order - b.order);
      const diagramSec = secs.find(s => s.title === "__diagram__");
      const contentSecs = secs.filter(s => s.title !== "__diagram__");

      setSections(contentSecs);
      if (diagramSec) {
        setDiagramCode(diagramSec.content);
        setDiagramSectionId(diagramSec.id);
      }

      setTitle(p.title);
      setDescription(p.description ?? "");
      setStatus(p.status);
      setMode(p.mode ?? "text");
      setLoading(false);
    });
  }, [planId, router]);

  const save = async (overrides?: Record<string, string>) => {
    await updatePlan(planId, { title, description: description || undefined, status, mode, ...overrides });
  };

  const saveCanvas = useCallback(async (data: string) => {
    await updatePlan(planId, { canvasData: data });
  }, [planId]);

  const saveDiagram = async (code: string) => {
    setDiagramCode(code);
    if (diagramSectionId) {
      await updatePlanSection(diagramSectionId, { content: code });
    } else {
      const sec = await addPlanSection(planId, "__diagram__", code, 99);
      setDiagramSectionId(sec.id);
    }
  };

  const addSection = async () => {
    const section = await addPlanSection(planId, "", "", sections.length);
    setSections((s) => [...s, section as Section]);
  };

  const updateSec = async (id: string, data: Partial<{ title: string; content: string }>) => {
    setSections((s) => s.map((sec) => sec.id === id ? { ...sec, ...data } : sec));
    await updatePlanSection(id, data);
  };

  const removeSec = async (id: string) => {
    setSections((s) => s.filter((sec) => sec.id !== id));
    await deletePlanSection(id);
  };

  const moveSec = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= sections.length) return;
    const r = [...sections];
    [r[index], r[ni]] = [r[ni], r[index]];
    setSections(r);
  };

  const remove = async () => { await deletePlan(planId); router.push("/planning"); };
  const diagramTemplate = `graph TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
    D --> F[Result]
    E --> F`;
  const switchMode = async (m: string) => {
    setMode(m);
    if (m === "diagram" && !diagramCode.trim()) {
      setDiagramCode(diagramTemplate);
      await saveDiagram(diagramTemplate);
    }
    await save({ mode: m });
  };

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;

  const selectClass = "h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-foreground/50 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div className={cn(mode === "canvas" ? "h-[calc(100vh-7rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8" : "")}>
      {/* Header */}
      <div className={cn("mb-6", mode === "canvas" && "px-4 pt-4 mb-2 flex-shrink-0")}>
        <button onClick={() => router.push("/planning")} className="flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground/60 transition-colors duration-150 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Planning
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save()} className={cn("font-medium tracking-[-0.02em] text-foreground/90 bg-transparent border-none outline-none w-full placeholder:text-foreground/40", mode === "canvas" ? "text-[18px]" : "text-[22px]")} placeholder="Plan title" />
            {mode !== "canvas" && <input value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => save()} className="text-[13px] text-foreground/50 bg-transparent border-none outline-none w-full mt-1 placeholder:text-foreground/35" placeholder="Add a description..." />}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={() => {
                const md = [`# ${title}`, description ? `\n${description}\n` : "", ...sections.map((s) => `## ${s.title}\n\n${s.content}`)].filter(Boolean).join("\n\n");
                const blob = new Blob([md], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors duration-150 flex items-center gap-1"
              title="Export as Markdown"
            >
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={remove} className="text-[12px] text-foreground/35 hover:text-red-400/70 transition-colors duration-150">Delete</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center border border-white/[0.06] rounded-lg p-0.5">
            {modes.map((m) => (
              <button key={m.key} onClick={() => switchMode(m.key)} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150", mode === m.key ? "bg-white/[0.08] text-foreground/70" : "text-foreground/45 hover:text-foreground/50")}>
                <m.icon className="w-3 h-3" /> {m.label}
              </button>
            ))}
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }); }} className={selectClass}>
            <option value="draft">Draft</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="archived">Archived</option>
          </select>
          <span className="text-[11px] text-foreground/35 capitalize">{plan?.type}</span>
        </div>
      </div>

      {/* === DOCUMENT MODE === */}
      {mode === "text" && (
        <article className="space-y-6">
          {sections.map((section, idx) => (
            <section key={section.id} className="group relative">
              {/* Section number — absolute left */}
              <div className="absolute -left-8 top-1 text-[11px] text-foreground/10 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block">
                {String(idx + 1).padStart(2, "0")}
              </div>

              {/* Title row */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={section.title}
                  onChange={(e) => updateSec(section.id, { title: e.target.value })}
                  className="text-[16px] font-medium text-foreground/85 bg-transparent border-none outline-none flex-1 placeholder:text-foreground/35"
                  placeholder="Section title"
                />
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button onClick={() => moveSec(idx, -1)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/[0.06] text-foreground/35"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveSec(idx, 1)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/[0.06] text-foreground/35"><ChevronDown className="w-3 h-3" /></button>
                  <button onClick={() => removeSec(section.id)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/10 text-foreground/35 hover:text-red-400/60"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>

              {/* Divider line under title */}
              <div className="h-px bg-white/[0.04] mb-3" />

              {/* Content */}
              <textarea
                value={section.content}
                onChange={(e) => updateSec(section.id, { content: e.target.value })}
                className="text-[14px] text-foreground/55 bg-transparent border-none outline-none w-full resize-none leading-[1.8] placeholder:text-foreground/12"
                placeholder="Write content..."
                rows={Math.max(3, section.content.split("\n").length + 1)}
              />
            </section>
          ))}

          <button
            onClick={addSection}
            className="w-full py-4 rounded-xl border border-dashed border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.01] text-[13px] text-foreground/35 hover:text-foreground/50 transition-colors duration-150 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add section
          </button>
        </article>
      )}

      {/* === CANVAS MODE === */}
      {mode === "canvas" && (
        <div className="flex-1 rounded-xl border border-white/[0.04] overflow-hidden mx-4 mb-4">
          <CanvasEditor initialData={plan?.canvasData ?? "{}"} onSave={saveCanvas} planId={planId} socket={socket} currentUser={session?.user ? { id: session.user.id, name: session.user.name } : undefined} />
        </div>
      )}

      {/* === DIAGRAM MODE === */}
      {mode === "diagram" && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setShowDiagramCode(!showDiagramCode)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors duration-150"
            >
              {showDiagramCode ? <EyeOff className="w-3 h-3" /> : <Code className="w-3 h-3" />}
              {showDiagramCode ? "Hide Code" : "Edit Code"}
            </button>
            <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors duration-150 cursor-pointer">
              <Upload className="w-3 h-3" /> Import
              <span className="text-[9px] text-foreground/35 ml-0.5">.md or .mmd</span>
              <input
                type="file"
                accept=".mmd,.md,.txt,.mermaid"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    if (!text) return;
                    // Detect: if it starts with markdown headings, convert to Mermaid
                    const trimmed = text.trim();
                    if (trimmed.startsWith("#") && !trimmed.startsWith("graph ") && !trimmed.startsWith("flowchart ") && !trimmed.startsWith("sequenceDiagram") && !trimmed.startsWith("classDiagram")) {
                      // It's markdown — auto-convert to mermaid flowchart
                      const lines = text.split("\n");
                      const mermaidLines = ["graph TD"];
                      let lastId = "";
                      let counter = 0;
                      for (const line of lines) {
                        const t = line.trim();
                        if (t.startsWith("## ")) {
                          const label = t.replace("## ", "").replace(/^\d+[\.\)]\s*/, "").trim();
                          if (!label) continue;
                          const id = `N${counter++}`;
                          mermaidLines.push(`  ${id}["${label}"]`);
                          if (lastId) mermaidLines.push(`  ${lastId} --> ${id}`);
                          lastId = id;
                        } else if (t.startsWith("### ")) {
                          const label = t.replace("### ", "").replace(/^\d+[\.\)]\s*/, "").trim();
                          if (!label) continue;
                          const id = `N${counter++}`;
                          mermaidLines.push(`  ${id}("${label}")`);
                          if (lastId) mermaidLines.push(`  ${lastId} --> ${id}`);
                          lastId = id;
                        }
                      }
                      if (mermaidLines.length > 1) {
                        saveDiagram(mermaidLines.join("\n"));
                      } else {
                        alert("No headings found in the markdown file.");
                      }
                    } else {
                      // It's Mermaid syntax — use directly
                      saveDiagram(text);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) saveDiagram(text);
                } catch {}
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-[12px] font-medium text-foreground/40 hover:text-foreground/60 transition-colors duration-150"
            >
              <Clipboard className="w-3 h-3" /> Paste
            </button>
          </div>

          <p className="text-[10px] text-foreground/35 mb-4 -mt-2">Upload a <strong>.mmd</strong> file with Mermaid syntax, or a <strong>.md</strong> file to auto-generate a flowchart from headings.</p>

          <div className={cn("rounded-xl border border-white/[0.04] overflow-hidden", showDiagramCode ? "grid grid-cols-1 lg:grid-cols-2" : "")}>
            {/* Code editor — only when toggled */}
            {showDiagramCode && (
              <div className="border-b lg:border-b-0 lg:border-r border-white/[0.04]">
                <div className="px-4 py-2.5 border-b border-white/[0.04]">
                  <span className="text-[11px] font-medium text-foreground/45">Mermaid Code</span>
                </div>
                <textarea
                  value={diagramCode}
                  onChange={(e) => saveDiagram(e.target.value)}
                  className="w-full p-4 text-[13px] font-mono text-foreground/50 bg-transparent border-none outline-none resize-y min-h-[200px] max-h-[70vh] leading-[1.7] placeholder:text-foreground/12 focus:text-foreground/65 transition-colors duration-150"
                  placeholder={"graph TD\n  A[Start] --> B[End]"}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Rendered diagram — always visible, full height */}
            <div className="bg-white/[0.01]">
              <div className="p-4 sm:p-6 overflow-auto">
                <MermaidPreview code={diagramCode} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
