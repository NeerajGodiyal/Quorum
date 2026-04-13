"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  getProject, updateProject, deleteProject, toggleStar,
  getProjectSections, addProjectSection, updateProjectSection, deleteProjectSection,
} from "../actions";
import { ArrowLeft, Star, Plus, Trash2, Loader2, FileText, ExternalLink, GitBranch, MessageCircle, ChevronDown, ChevronRight, X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { MermaidPreview } from "@/components/planning/mermaid-preview";
import dynamic from "next/dynamic";

const CanvasEditor = dynamic(() => import("@/components/planning/canvas-editor").then(m => m.CanvasEditor), { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div> });

interface Project { id: string; title: string; description: string | null; icon: string; color: string; starred: boolean; status: string; createdBy: string; createdAt: Date; updatedAt: Date; authorName: string | null; }
interface Section { id: string; title: string; type: string; content: string; canvasData: string; order: number; }

const SECTION_TYPES = [
  { type: "notes", label: "Notes", icon: FileText },
  { type: "links", label: "Links", icon: Link2 },
  { type: "architecture", label: "Architecture", icon: GitBranch },
  { type: "discussion", label: "Discussion", icon: MessageCircle },
];

const TYPE_ICON: Record<string, typeof FileText> = {
  notes: FileText,
  links: Link2,
  architecture: GitBranch,
  discussion: MessageCircle,
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [archMode, setArchMode] = useState<Record<string, "canvas" | "diagram">>({}); // per section

  useEffect(() => {
    Promise.all([getProject(projectId), getProjectSections(projectId)]).then(([p, s]) => {
      if (!p) { router.push("/projects"); return; }
      setProject(p as Project);
      setSections(s as Section[]);
      setTitle(p.title);
      setDescription(p.description ?? "");
      if (s.length > 0) setExpandedSection((s as Section[])[0].id);
      setLoading(false);
    });
  }, [projectId, router]);

  const save = async (overrides?: Record<string, string>) => {
    await updateProject(projectId, { title, description: description || undefined, ...overrides });
  };

  const handleStar = async () => {
    const newVal = await toggleStar(projectId);
    setProject((p) => p ? { ...p, starred: !!newVal } : p);
  };

  const remove = async () => {
    await deleteProject(projectId);
    router.push("/projects");
  };

  const handleAddSection = async (type: string) => {
    const label = SECTION_TYPES.find((t) => t.type === type)?.label ?? "Section";
    const section = await addProjectSection(projectId, label, type, sections.length);
    setSections((s) => [...s, section as Section]);
    setExpandedSection(section.id);
    setShowAddSection(false);
  };

  const handleUpdateSection = async (id: string, data: Partial<{ title: string; content: string; canvasData: string }>) => {
    setSections((s) => s.map((sec) => sec.id === id ? { ...sec, ...data } : sec));
    await updateProjectSection(id, data);
  };

  const handleDeleteSection = async (id: string) => {
    setSections((s) => s.filter((sec) => sec.id !== id));
    await deleteProjectSection(id);
    if (expandedSection === id) setExpandedSection(null);
  };

  const saveCanvas = useCallback(async (sectionId: string, data: string) => {
    await updateProjectSection(sectionId, { canvasData: data });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  if (!project) return null;

  const selectClass = "h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-foreground/50 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push("/projects")} className="flex items-center gap-1.5 text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors duration-150 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Projects
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-[28px]">{project.icon}</span>
            <div className="flex-1 min-w-0">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => save()}
                className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90 bg-transparent border-none outline-none w-full placeholder:text-foreground/40"
                placeholder="Project title"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => save()}
                className="text-[13px] text-foreground/50 bg-transparent border-none outline-none w-full mt-0.5 placeholder:text-foreground/35"
                placeholder="Add a description..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button onClick={handleStar} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150", project.starred ? "text-[#14F195]" : "text-foreground/25 hover:text-foreground/50")}>
              <Star className={cn("w-4 h-4", project.starred && "fill-current")} />
            </button>
            <select value={project.status} onChange={(e) => { setProject((p) => p ? { ...p, status: e.target.value } : p); save({ status: e.target.value }); }} className={selectClass}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={remove} className="text-[12px] text-foreground/30 hover:text-red-400/70 transition-colors duration-150">Delete</button>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section, idx) => {
          const Icon = TYPE_ICON[section.type] ?? FileText;
          const isExpanded = expandedSection === section.id;
          const mode = archMode[section.id] ?? "canvas";

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              className="border border-white/[0.04] rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <div
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer group"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-foreground/30" /> : <ChevronRight className="w-3.5 h-3.5 text-foreground/30" />}
                <Icon className="w-3.5 h-3.5 text-foreground/40" />
                <input
                  value={section.title}
                  onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => {}}
                  className="text-[13px] font-medium text-foreground/70 bg-transparent border-none outline-none flex-1 min-w-0 text-left"
                />
                <span className="text-[10px] text-foreground/25 uppercase tracking-wider mr-2">{section.type}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                  className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150"
                >
                  <Trash2 className="w-3 h-3 text-foreground/25 hover:text-red-400/60" />
                </button>
              </div>

              {/* Section content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1">
                      {/* NOTES / DISCUSSION */}
                      {(section.type === "notes" || section.type === "discussion") && (
                        <textarea
                          value={section.content}
                          onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                          placeholder={section.type === "discussion" ? "Team discussion notes..." : "Write notes here..."}
                          className="w-full min-h-[120px] text-[14px] text-foreground/70 bg-transparent border border-white/[0.04] rounded-lg p-3 focus:outline-none focus:border-white/[0.08] resize-y placeholder:text-foreground/30 leading-relaxed transition-colors duration-150"
                        />
                      )}

                      {/* LINKS */}
                      {section.type === "links" && (
                        <LinksEditor
                          content={section.content}
                          onChange={(content) => handleUpdateSection(section.id, { content })}
                        />
                      )}

                      {/* ARCHITECTURE */}
                      {section.type === "architecture" && (
                        <div>
                          <div className="flex gap-1 mb-3">
                            <button
                              onClick={() => setArchMode({ ...archMode, [section.id]: "canvas" })}
                              className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150", mode === "canvas" ? "bg-white/[0.08] text-foreground/70" : "text-foreground/40 hover:text-foreground/50")}
                            >
                              Canvas
                            </button>
                            <button
                              onClick={() => setArchMode({ ...archMode, [section.id]: "diagram" })}
                              className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-150", mode === "diagram" ? "bg-white/[0.08] text-foreground/70" : "text-foreground/40 hover:text-foreground/50")}
                            >
                              Diagram
                            </button>
                          </div>
                          {mode === "canvas" ? (
                            <div className="h-[500px] border border-white/[0.04] rounded-lg overflow-hidden">
                              <CanvasEditor
                                planId={section.id}
                                initialData={section.canvasData}
                                onSave={(data) => saveCanvas(section.id, data)}
                              />
                            </div>
                          ) : (
                            <div>
                              <textarea
                                value={section.content}
                                onChange={(e) => handleUpdateSection(section.id, { content: e.target.value })}
                                placeholder="Enter Mermaid diagram syntax..."
                                className="w-full min-h-[100px] text-[12px] font-mono text-foreground/60 bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 focus:outline-none focus:border-white/[0.08] resize-y placeholder:text-foreground/30 mb-3 transition-colors duration-150"
                              />
                              {section.content.trim() && <MermaidPreview code={section.content} />}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Add section */}
      <div className="mt-4">
        {showAddSection ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 border border-white/[0.06] rounded-xl"
          >
            {SECTION_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => handleAddSection(t.type)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.04] text-[12px] text-foreground/50 hover:text-foreground/70 transition-colors duration-150"
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
            <button onClick={() => setShowAddSection(false)} className="ml-auto w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-foreground/30" />
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.01] text-[12px] text-foreground/35 hover:text-foreground/50 transition-all duration-150 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add section
          </button>
        )}
      </div>
    </div>
  );
}

// ── Links Editor Component ──
function LinksEditor({ content, onChange }: { content: string; onChange: (content: string) => void }) {
  const links: { title: string; url: string }[] = (() => {
    try { return JSON.parse(content || "[]"); } catch { return []; }
  })();
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const addLink = () => {
    if (!newUrl.trim()) return;
    const updated = [...links, { title: newTitle.trim() || newUrl.trim(), url: newUrl.trim() }];
    onChange(JSON.stringify(updated));
    setNewUrl("");
    setNewTitle("");
  };

  const removeLink = (idx: number) => {
    const updated = links.filter((_, i) => i !== idx);
    onChange(JSON.stringify(updated));
  };

  return (
    <div className="space-y-2">
      {links.map((link, i) => {
        let hostname = "";
        try { hostname = new URL(link.url).hostname; } catch {}
        return (
          <div key={i} className="flex items-center gap-3 group">
            {hostname && (
              <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="w-4 h-4 rounded opacity-50 flex-shrink-0" />
            )}
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-foreground/60 hover:text-foreground/80 transition-colors duration-150 flex-1 min-w-0 truncate">
              {link.title}
            </a>
            <span className="text-[11px] text-foreground/25 hidden sm:inline">{hostname}</span>
            <button onClick={() => removeLink(i)} className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150">
              <X className="w-3 h-3 text-foreground/30" />
            </button>
          </div>
        );
      })}
      <div className="flex gap-2 pt-1">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Label"
          className="w-32 h-8 px-2.5 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-foreground/60 placeholder:text-foreground/30 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
        />
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLink()}
          placeholder="https://..."
          className="flex-1 h-8 px-2.5 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-foreground/60 placeholder:text-foreground/30 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
        />
        <button onClick={addLink} className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[12px] text-foreground/50 transition-colors duration-150">Add</button>
      </div>
    </div>
  );
}
