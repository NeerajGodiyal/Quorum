"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { getPlans, createPlan, deletePlan } from "./actions";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-foreground/20" },
  in_review: { label: "In review", dot: "bg-amber-400" },
  approved: { label: "Approved", dot: "bg-emerald-400" },
  archived: { label: "Archived", dot: "bg-foreground/10" },
};

interface Plan { id: string; title: string; type: string; description: string | null; status: string; authorName: string | null; createdAt: Date; }

export default function PlanningPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", type: "general", mode: "text", description: "" });

  useEffect(() => { getPlans().then((p) => setPlans(p as Plan[])); }, []);

  const create = async () => {
    if (!form.title.trim() || !session?.user) return;
    const plan = await createPlan({ title: form.title, type: form.type as any, mode: form.mode as any, description: form.description || undefined, createdBy: session.user.id });
    setPlans((p) => [{ ...plan, authorName: session.user.name, description: plan.description, mode: plan.mode } as Plan, ...p]);
    setForm({ title: "", type: "general", mode: "text", description: "" });
    setShowNew(false);
  };

  const remove = async (id: string) => { await deletePlan(id); setPlans((p) => p.filter((x) => x.id !== id)); };

  const selectClass = "w-full h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-[13px] text-foreground/70 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Planning</h1>
          <p className="text-[13px] text-foreground/50 mt-1">Architecture, design, and research plans</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/60 transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          New Plan
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
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-foreground/60">New plan</span>
                <button onClick={() => setShowNew(false)} className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-foreground/40 hover:text-foreground/40 transition-colors duration-150">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-[12px] text-foreground/50 mb-1.5 block">Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Plan title" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" autoFocus />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Type</Label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
                      <option value="architecture">Architecture</option>
                      <option value="design">Design</option>
                      <option value="research">Research</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Mode</Label>
                    <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className={selectClass}>
                      <option value="text">Document</option>
                      <option value="canvas">Canvas</option>
                      <option value="diagram">Diagram</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Description</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <button onClick={() => setShowNew(false)} className="h-8 px-3 text-[13px] text-foreground/50 hover:text-foreground/50 transition-colors duration-150">Cancel</button>
                <button onClick={create} className="h-8 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150">Create</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {plans.length > 0 ? (
        <div className="space-y-px rounded-xl border border-white/[0.04] overflow-hidden">
          {plans.map((plan, i) => {
            const status = statusConfig[plan.status] ?? statusConfig.draft;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => router.push(`/planning/${plan.id}`)}
                className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.015] hover:bg-white/[0.03] transition-colors duration-150 group cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium text-foreground/75 truncate">{plan.title}</h3>
                    <span className="text-[10px] text-foreground/35 capitalize flex-shrink-0">{plan.type}</span>
                  </div>
                  {plan.description && <p className="text-[12px] text-foreground/45 truncate mt-0.5">{plan.description}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                    <span className="text-[11px] text-foreground/45 hidden sm:inline">{status.label}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(plan.id); }}
                    className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150"
                  >
                    <Trash2 className="w-3 h-3 text-foreground/45" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : !showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full py-12 rounded-xl border border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.01] transition-colors duration-150 group"
        >
          <FileText className="w-6 h-6 mx-auto mb-2 text-foreground/10 group-hover:text-foreground/40 transition-colors duration-150" />
          <p className="text-[13px] text-foreground/40 group-hover:text-foreground/50 transition-colors duration-150">Create your first plan</p>
        </button>
      ) : null}
    </div>
  );
}
