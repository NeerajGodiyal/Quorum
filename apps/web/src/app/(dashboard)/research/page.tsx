"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { getPins, createPin, deletePin } from "./actions";
import { useSession } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, ExternalLink, Trash2, X, Bookmark, Search } from "lucide-react";

interface Pin { id: string; title: string; url: string | null; description: string | null; content: string | null; tags: string; color: string | null; createdAt: Date; }

export default function ResearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "", content: "", tags: "" });
  const [filter, setFilter] = useState("");

  useEffect(() => { getPins().then((p) => setPins(p as Pin[])); }, []);

  const create = async () => {
    if (!form.title.trim() || !session?.user) return;
    const pin = await createPin({ title: form.title, url: form.url || undefined, description: form.description || undefined, content: form.content || undefined, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean), createdBy: session.user.id });
    setPins((p) => [pin as Pin, ...p]);
    setForm({ title: "", url: "", description: "", content: "", tags: "" });
    setShowNew(false);
  };

  const remove = async (id: string) => { await deletePin(id); setPins((p) => p.filter((x) => x.id !== id)); };

  const filtered = pins.filter((p) => !filter || p.title.toLowerCase().includes(filter.toLowerCase()) || p.tags.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Research</h1>
          <p className="text-[13px] text-foreground/50 mt-1">Links, notes, and ideas</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search - ergonomic: icon inside label triggers focus */}
          <label className="relative flex items-center">
            <Search className="absolute left-2.5 w-3 h-3 text-foreground/35 pointer-events-none" />
            <input
              placeholder="Filter..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-28 sm:w-36 h-8 pl-7 pr-3 text-[12px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-foreground/60 placeholder:text-foreground/35 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
            />
          </label>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/60 transition-all duration-150">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
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
                <span className="text-[13px] font-medium text-foreground/60">New pin</span>
                <button onClick={() => setShowNew(false)} className="w-6 h-6 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-foreground/40 hover:text-foreground/40 transition-colors duration-150">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" autoFocus />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/50 mb-1.5 block">URL</Label>
                    <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                  </div>
                </div>
                <div>
                  <Label className="text-[12px] text-foreground/50 mb-1.5 block">Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                </div>
                <div>
                  <Label className="text-[12px] text-foreground/50 mb-1.5 block">Notes</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Detailed notes..." className="text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] min-h-[60px]" />
                </div>
                <div>
                  <Label className="text-[12px] text-foreground/50 mb-1.5 block">Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="design, ux, research" className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]" />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <button onClick={() => setShowNew(false)} className="h-8 px-3 text-[13px] text-foreground/50 hover:text-foreground/50 transition-colors duration-150">Cancel</button>
                <button onClick={create} className="h-8 px-4 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150">Save</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-0">
          {filtered.map((pin, i) => {
            const tags: string[] = (() => { try { return JSON.parse(pin.tags); } catch { return []; } })();
            let hostname = "";
            try { if (pin.url) hostname = new URL(pin.url).hostname; } catch {}
            return (
              <motion.div
                key={pin.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => router.push(`/research/${pin.id}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 group cursor-pointer"
              >
                {hostname && (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                    alt=""
                    className="w-5 h-5 rounded flex-shrink-0 opacity-50 group-hover:opacity-80 transition-opacity duration-150"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium text-foreground/70 group-hover:text-foreground/90 transition-colors duration-150">{pin.title}</h3>
                    {hostname && (
                      <span className="text-[11px] text-foreground/30">{hostname}</span>
                    )}
                  </div>
                  {pin.description && <p className="text-[12px] text-foreground/40 mt-0.5 line-clamp-1">{pin.description}</p>}
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {tags.map((tag) => (
                        <span key={tag} className="text-[10px] text-foreground/30 bg-white/[0.03] px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(pin.id); }}
                  className="w-6 h-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3 text-foreground/40" />
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : !showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="w-full py-12 rounded-xl border border-dashed border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.01] transition-colors duration-150 group"
        >
          <Bookmark className="w-6 h-6 mx-auto mb-2 text-foreground/10 group-hover:text-foreground/40 transition-colors duration-150" />
          <p className="text-[13px] text-foreground/40 group-hover:text-foreground/50 transition-colors duration-150">Save your first pin</p>
        </button>
      ) : null}
    </div>
  );
}
