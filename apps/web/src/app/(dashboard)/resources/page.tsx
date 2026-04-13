"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getResources, createResource, deleteResource } from "./actions";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X, Search, ExternalLink, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource { id: string; name: string; type: string; description: string | null; url: string | null; tags: string; capacity: number | null; createdAt: Date; }

const TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "tool", label: "Tools" },
  { key: "person", label: "People" },
  { key: "budget", label: "Budgets" },
  { key: "document", label: "Docs" },
  { key: "other", label: "Other" },
];

export default function ResourcesPage() {
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", type: "tool", url: "", description: "", tags: "", capacity: "" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => { getResources().then((r) => setResources(r as Resource[])); }, []);

  // Parse all tags for the tag cloud
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of resources) {
      try { JSON.parse(r.tags ?? "[]").forEach((t: string) => tags.add(t)); } catch {}
    }
    return Array.from(tags).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !(r.description ?? "").toLowerCase().includes(q) && !(r.url ?? "").toLowerCase().includes(q)) return false;
      }
      if (tagFilter) {
        try { if (!JSON.parse(r.tags ?? "[]").includes(tagFilter)) return false; } catch { return false; }
      }
      return true;
    });
  }, [resources, search, typeFilter, tagFilter]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: resources.length };
    for (const r of resources) c[r.type] = (c[r.type] ?? 0) + 1;
    return c;
  }, [resources]);

  const create = async () => {
    if (!form.name.trim() || !session?.user) return;
    const res = await createResource({
      name: form.name, type: form.type as any, url: form.url || undefined,
      description: form.description || undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      capacity: form.capacity ? parseInt(form.capacity) : undefined,
      createdBy: session.user.id,
    });
    setResources((p) => [res as Resource, ...p]);
    setForm({ name: "", type: "tool", url: "", description: "", tags: "", capacity: "" });
    setShowNew(false);
  };

  const remove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteResource(id);
    setResources((p) => p.filter((r) => r.id !== id));
  };

  const handleClick = (r: Resource) => {
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Resources</h1>
          <p className="text-[13px] text-foreground/50 mt-1">{resources.length} link{resources.length !== 1 ? "s" : ""} saved</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/60 transition-all duration-150">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-2">
        <label className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-foreground/35 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-40 sm:w-52 h-8 pl-8 pr-3 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-foreground/60 placeholder:text-foreground/35 focus:outline-none focus:border-white/[0.12] transition-colors duration-150" />
        </label>
        <div className="flex items-center gap-0.5 border border-white/[0.06] rounded-lg p-0.5 overflow-x-auto">
          {TYPE_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)} className={cn("px-2 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 whitespace-nowrap", typeFilter === f.key ? "bg-white/[0.08] text-foreground/70" : "text-foreground/45 hover:text-foreground/45")}>
              {f.label}{(typeCounts[f.key] ?? 0) > 0 && <span className="ml-1 tabular-nums text-foreground/35">{typeCounts[f.key]}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {tagFilter && (
            <button onClick={() => setTagFilter("")} className="text-[10px] text-foreground/40 hover:text-foreground/60 mr-1 transition-colors duration-150">Clear</button>
          )}
          {allTags.map((tag) => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)} className={cn("text-[10px] px-2 py-0.5 rounded-md transition-colors duration-150", tagFilter === tag ? "bg-white/[0.1] text-foreground/70" : "bg-white/[0.03] text-foreground/40 hover:text-foreground/40")}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.2 }} className="mb-5 overflow-hidden">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-foreground/60">Add resource</span>
                <button onClick={() => setShowNew(false)} className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-foreground/40 hover:text-foreground/40 transition-colors duration-150"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Resource name" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" autoFocus />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">URL</Label>
                    <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Type</Label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-[13px] text-foreground/70 focus:outline-none focus:border-white/[0.12] transition-colors duration-150">
                      <option value="tool">Tool</option><option value="person">Person</option><option value="budget">Budget</option><option value="document">Document</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Tags</Label>
                    <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="design, tool" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Description</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <button onClick={() => setShowNew(false)} className="h-8 px-3 text-[13px] text-foreground/50 hover:text-foreground/50 transition-colors duration-150">Cancel</button>
                <button onClick={create} className="h-8 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150">Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource list — flat, no card/border wrapper, hover only */}
      {filtered.length > 0 ? (
        <div>
          {filtered.map((res, i) => {
            const tags: string[] = (() => { try { return JSON.parse(res.tags ?? "[]"); } catch { return []; } })();
            let hostname = "";
            try { if (res.url) hostname = new URL(res.url).hostname.replace("www.", ""); } catch {}

            return (
              <motion.a
                key={res.id}
                href={res.url ?? undefined}
                target={res.url ? "_blank" : undefined}
                rel={res.url ? "noopener noreferrer" : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group cursor-pointer"
              >
                {/* Favicon / icon area */}
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                  {hostname ? (
                    <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" className="w-4 h-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 text-foreground/40" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground/75 truncate">{res.name}</span>
                    {hostname && <span className="text-[11px] text-foreground/40 flex-shrink-0">{hostname}</span>}
                    {res.capacity != null && (
                      <span className="text-[10px] text-foreground/35 tabular-nums flex-shrink-0">
                        {res.type === "budget" ? `$${res.capacity.toLocaleString()}` : res.capacity}
                      </span>
                    )}
                  </div>
                  {res.description && <p className="text-[11px] text-foreground/40 truncate mt-0.5">{res.description}</p>}
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {tags.map((tag) => (
                        <span key={tag} className="text-[9px] text-foreground/35 bg-white/[0.03] px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side */}
                <span className="text-[10px] text-foreground/10 capitalize hidden sm:inline flex-shrink-0">{res.type}</span>
                <button onClick={(e) => remove(e, res.id)} className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150 flex-shrink-0">
                  <Trash2 className="w-3 h-3 text-foreground/40" />
                </button>
              </motion.a>
            );
          })}
        </div>
      ) : search || typeFilter !== "all" || tagFilter ? (
        <div className="text-center py-12">
          <Search className="w-6 h-6 mx-auto mb-2 text-foreground/10" />
          <p className="text-[13px] text-foreground/40">No resources match</p>
          <button onClick={() => { setSearch(""); setTypeFilter("all"); setTagFilter(""); }} className="text-[12px] text-foreground/50 hover:text-foreground/50 mt-2 transition-colors duration-150">Clear filters</button>
        </div>
      ) : !showNew ? (
        <button onClick={() => setShowNew(true)} className="w-full py-12 rounded-xl border border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.01] transition-colors duration-150 group">
          <Link2 className="w-6 h-6 mx-auto mb-2 text-foreground/10 group-hover:text-foreground/40 transition-colors duration-150" />
          <p className="text-[13px] text-foreground/40 group-hover:text-foreground/50 transition-colors duration-150">Save your first resource</p>
        </button>
      ) : null}
    </div>
  );
}
