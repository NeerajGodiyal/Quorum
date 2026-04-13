"use client";

import { motion } from "motion/react";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Notifications } from "./notifications";

export function Topbar() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "";

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="h-12 border-b border-white/[0.04] flex items-center justify-end px-4 lg:px-8 xl:px-12 2xl:px-16 sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl"
    >
      {/* Spacer for mobile hamburger */}
      <div className="w-10 lg:hidden flex-1" />

      {/* Cmd+K search hint */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors duration-150 cursor-pointer mr-auto"
      >
        <span className="text-[12px] text-foreground/25">Search...</span>
        <kbd className="text-[10px] text-foreground/20 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">⌘K</kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Notifications />

        <div className="h-5 w-px bg-white/[0.06] mx-1 hidden sm:block" />

        <div className="flex items-center gap-2.5 pl-1">
          <Avatar className="w-8 h-8 border border-white/[0.08]">
            <AvatarFallback className="bg-white/[0.04] text-foreground/50 text-[11px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-[13px] font-medium leading-none text-foreground/80">
              {session?.user?.name ?? ""}
            </p>
            <p className="text-[11px] text-foreground/50 mt-0.5">
              {session?.user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
