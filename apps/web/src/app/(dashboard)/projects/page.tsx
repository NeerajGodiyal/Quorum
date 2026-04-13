"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getProjects, createProject, deleteProject, toggleStar } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Star, Loader2, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  starred: boolean;
  status: string;
  createdAt: Date;
  authorName: string | null;
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400",
  paused: "bg-amber-400",
  completed: "bg-blue-400",
  archived: "bg-foreground/20",
};

const ICONS = ["📁", "⚡", "🔥", "🛡️", "🚀", "💎", "🧪", "🔧", "🎯", "🌐"];

export default function ProjectsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", icon: "📁" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getProjects().then((p) => { setProjectList(p as Project[]); setLoading(false); });
  }, []);

  const create = async () => {
    if (!form.title.trim() || !session?.user) return;
    setCreating(true);
    const project = await createProject({ title: form.title, description: form.description || undefined, icon: form.icon, createdBy: session.user.id });
    setProjectList((prev) => [{ ...project, authorName: session.user.name, starred: false } as Project, ...prev]);
    setForm({ title: "", description: "", icon: "📁" });
    setShowNew(false);
    setCreating(false);
  };

  const handleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newVal = await toggleStar(id);
    setProjectList((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, starred: !!newVal } : p);
      return updated.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id);
    setProjectList((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Projects</h1>
          <p className="text-[13px] text-foreground/50 mt-0.5">{projectList.length} project{projectList.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/60 transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-foreground/60">New project</span>
                <button onClick={() => setShowNew(false)} className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-foreground/40" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  {/* Icon picker */}
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1 block">Icon</Label>
                    <div className="flex flex-wrap gap-1 w-[180px]">
                      {ICONS.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setForm({ ...form, icon })}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[16px] transition-all duration-150",
                            form.icon === icon ? "bg-white/[0.1] ring-1 ring-white/20" : "hover:bg-white/[0.04]"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-[12px] text-foreground/50 mb-1 block">Title</Label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Project name"
                        className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-[12px] text-foreground/50 mb-1 block">Description</Label>
                      <Input
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Brief description"
                        className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowNew(false)} className="h-8 px-3 text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors duration-150">Cancel</button>
                <button
                  onClick={create}
                  disabled={creating || !form.title.trim()}
                  className="h-8 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150 disabled:opacity-40 flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project list */}
      {projectList.length > 0 ? (
        <div className="space-y-0">
          {projectList.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              onClick={() => router.push(`/projects/${project.id}`)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group cursor-pointer"
            >
              <span className="text-[20px] flex-shrink-0">{project.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-medium text-foreground/75 group-hover:text-foreground/90 transition-colors duration-150">{project.title}</h3>
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[project.status] ?? STATUS_DOT.active)} />
                  <span className="text-[10px] text-foreground/30 capitalize">{project.status}</span>
                </div>
                {project.description && (
                  <p className="text-[12px] text-foreground/40 mt-0.5 line-clamp-1">{project.description}</p>
                )}
              </div>
              <button
                onClick={(e) => handleStar(e, project.id)}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 flex-shrink-0",
                  project.starred ? "text-[#14F195]" : "text-foreground/15 opacity-0 group-hover:opacity-100 hover:text-foreground/40"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", project.starred && "fill-current")} />
              </button>
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="w-7 h-7 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150 flex-shrink-0"
              >
                <Trash2 className="w-3 h-3 text-foreground/30" />
              </button>
            </motion.div>
          ))}
        </div>
      ) : !showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full py-12 rounded-xl border border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.01] transition-colors duration-150 group"
        >
          <Plus className="w-6 h-6 mx-auto mb-2 text-foreground/10 group-hover:text-foreground/30 transition-colors duration-150" />
          <p className="text-[13px] text-foreground/40 group-hover:text-foreground/50 transition-colors duration-150">Create your first project</p>
        </button>
      ) : null}
    </div>
  );
}
