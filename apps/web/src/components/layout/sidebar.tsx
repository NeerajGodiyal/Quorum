"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FolderKanban,
  FileText,
  Bookmark,
  MessageCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";

/*
  Sidebar navigation.
  - Compact grouping with section labels
  - Active: left accent bar + brighter text
  - Accent used sparingly — only on the active indicator bar
  - Icons at 16px, muted, brighten on active
*/

const sections = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Projects", href: "/projects", icon: Layers },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Chat", href: "/chat", icon: MessageCircle },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { name: "Planning", href: "/planning", icon: FileText },
      { name: "Research", href: "/research", icon: Bookmark },
      { name: "Resources", href: "/resources", icon: FolderKanban },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const nav = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-8">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Overclock" className="w-6 h-6" />
          <span className="text-[13px] font-semibold tracking-[0.04em] text-foreground/70">
            Overclock
          </span>
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-2">
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground/40">
                {section.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 active:scale-[0.97]",
                      active
                        ? "text-foreground/90 bg-white/[0.05]"
                        : "text-foreground/40 hover:text-foreground/65 hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-full bg-[#14F195]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <item.icon className={cn(
                      "w-[16px] h-[16px] flex-shrink-0 transition-colors duration-150",
                      active ? "text-foreground/60" : "text-foreground/40"
                    )} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom utility */}
      <div className="px-3 pb-5 pt-2 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[13px] font-medium transition-colors duration-150",
            pathname === "/settings"
              ? "text-foreground/70 bg-white/[0.04]"
              : "text-foreground/40 hover:text-foreground/40 hover:bg-white/[0.02]"
          )}
        >
          <Settings className="w-[15px] h-[15px]" />
          <span>Settings</span>
        </Link>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
          className="w-full flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[13px] font-medium text-foreground/40 hover:text-red-400/70 hover:bg-red-400/[0.04] transition-colors duration-150"
        >
          <LogOut className="w-[15px] h-[15px]" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-[#131313] border border-white/[0.06] flex items-center justify-center hover:bg-[#1a1a1a] transition-colors"
      >
        <Menu className="w-[18px] h-[18px] text-foreground/40" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/70 z-40"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[220px] bg-[#0e0e0e] z-50"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-3 w-7 h-7 rounded-md flex items-center justify-center text-foreground/45 hover:text-foreground/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {nav}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 w-[220px] bg-[#0e0e0e] z-40"
      >
        {nav}
      </motion.aside>
    </>
  );
}
