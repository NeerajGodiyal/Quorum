"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckSquare, MessageCircle, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";

interface Notification {
  id: string;
  type: "task" | "message" | "plan";
  title: string;
  body: string;
  time: Date;
  read: boolean;
}

const ICON_MAP = {
  task: CheckSquare,
  message: MessageCircle,
  plan: FileText,
};

export function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { type: string; title: string; body: string }) => {
      setNotifications((prev) => [{
        id: `n-${Date.now()}`,
        type: data.type as Notification["type"],
        title: data.title,
        body: data.body,
        time: new Date(),
        read: false,
      }, ...prev]);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const timeAgo = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          if (!open && unreadCount > 0) markAllRead();
          setOpen(!open);
        }}
        className="relative w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] active:scale-[0.97] transition-all duration-150"
      >
        <Bell className="w-3.5 h-3.5 text-foreground/50" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#14F195] text-[9px] font-medium text-[#0a0a0a] flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[320px] bg-[#141414] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground/70">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-foreground/35 hover:text-foreground/60 transition-colors duration-150">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length > 0 ? notifications.map((n) => {
                const Icon = ICON_MAP[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors duration-150 group cursor-pointer",
                      !n.read && "bg-white/[0.01]"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", !n.read ? "bg-[#14F195]/10" : "bg-white/[0.03]")}>
                      <Icon className={cn("w-3.5 h-3.5", !n.read ? "text-[#14F195]" : "text-foreground/30")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] leading-snug", !n.read ? "text-foreground/75 font-medium" : "text-foreground/50")}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-foreground/30 mt-0.5">{n.body}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-foreground/20 tabular-nums">{timeAgo(n.time)}</span>
                      <button onClick={() => dismiss(n.id)} className="w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] flex items-center justify-center transition-all duration-150">
                        <X className="w-3 h-3 text-foreground/30" />
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-8 text-center">
                  <Bell className="w-5 h-5 mx-auto mb-2 text-foreground/10" />
                  <p className="text-[12px] text-foreground/30">No notifications</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
