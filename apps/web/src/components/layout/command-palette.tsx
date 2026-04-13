"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, CheckSquare, MessageCircle, FileText, Bookmark,
  FolderKanban, Settings, Plus, Search, LogOut, Layers,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Projects", href: "/projects", icon: Layers, keywords: "project mithril lightbringer" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, keywords: "kanban board todo" },
  { label: "Chat", href: "/chat", icon: MessageCircle, keywords: "messages channels" },
  { label: "Planning", href: "/planning", icon: FileText, keywords: "architecture design diagram canvas" },
  { label: "Research", href: "/research", icon: Bookmark, keywords: "pins bookmarks notes links" },
  { label: "Resources", href: "/resources", icon: FolderKanban, keywords: "tools budgets docs links" },
  { label: "Settings", href: "/settings", icon: Settings, keywords: "profile account preferences" },
];

const ACTIONS = [
  { label: "New Task", href: "/tasks", icon: Plus, keywords: "create add task" },
  { label: "New Plan", href: "/planning", icon: Plus, keywords: "create add plan architecture" },
  { label: "New Research Pin", href: "/research", icon: Plus, keywords: "create add pin bookmark" },
  { label: "New Resource", href: "/resources", icon: Plus, keywords: "create add resource link" },
  { label: "New Project", href: "/projects", icon: Plus, keywords: "create add project" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    await signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90%] max-w-[520px] z-[101]"
          >
            <Command className="rounded-xl border border-white/[0.08] bg-[#141414] shadow-2xl shadow-black/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-foreground/30 flex-shrink-0" />
                <Command.Input
                  placeholder="Search pages, actions..."
                  className="w-full h-12 bg-transparent text-[14px] text-foreground/80 placeholder:text-foreground/25 outline-none border-none"
                  autoFocus
                />
                <kbd className="text-[10px] text-foreground/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] flex-shrink-0">ESC</kbd>
              </div>

              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-[13px] text-foreground/30">
                  No results found
                </Command.Empty>

                <Command.Group heading={<span className="text-[10px] font-medium tracking-[0.08em] uppercase text-foreground/25 px-2 py-1">Navigate</span>}>
                  {NAV_ITEMS.map((item) => (
                    <Command.Item
                      key={item.href}
                      value={`${item.label} ${item.keywords}`}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-foreground/60 cursor-pointer data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground/90 transition-colors duration-100"
                    >
                      <item.icon className="w-4 h-4 text-foreground/30" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="h-px bg-white/[0.04] my-1" />

                <Command.Group heading={<span className="text-[10px] font-medium tracking-[0.08em] uppercase text-foreground/25 px-2 py-1">Actions</span>}>
                  {ACTIONS.map((item) => (
                    <Command.Item
                      key={item.label}
                      value={`${item.label} ${item.keywords}`}
                      onSelect={() => navigate(item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-foreground/60 cursor-pointer data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground/90 transition-colors duration-100"
                    >
                      <item.icon className="w-4 h-4 text-foreground/30" />
                      {item.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="h-px bg-white/[0.04] my-1" />

                <Command.Item
                  value="sign out logout"
                  onSelect={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-foreground/40 cursor-pointer data-[selected=true]:bg-red-500/[0.06] data-[selected=true]:text-red-400/80 transition-colors duration-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Command.Item>
              </Command.List>

              <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10px] text-foreground/20">Navigate with ↑↓ Enter</span>
                <span className="text-[10px] text-foreground/20">⌘K to toggle</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
