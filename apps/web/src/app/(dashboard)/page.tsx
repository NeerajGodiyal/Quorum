"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useSession } from "@/lib/auth-client";
import {
  CheckSquare,
  FolderKanban,
  FileText,
  MessageCircle,
  Bookmark,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "./actions";

const quickActions = [
  { label: "Tasks", href: "/tasks", icon: CheckSquare, desc: "Manage and assign work" },
  { label: "Chat", href: "/chat", icon: MessageCircle, desc: "Team discussions" },
  { label: "Research", href: "/research", icon: Bookmark, desc: "Pins and references" },
  { label: "Planning", href: "/planning", icon: FileText, desc: "Architecture and design" },
  { label: "Resources", href: "/resources", icon: FolderKanban, desc: "Links and tools" },
];

interface Stats { openTasks: number; pins: number; channels: number; resources: number; plans: number; projects: number; }
interface Activity { type: string; text: string; target: string; href: string; time: Date | null; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    Promise.all([getDashboardStats(), getRecentActivity()])
      .then(([s, a]) => {
        setStats(s);
        setActivity(a as Activity[]);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const timeAgo = (d: Date | null) => {
    if (!d) return "";
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <div>
      {/* Greeting */}
      <div className="pt-2 pb-8">
        <h1 className="text-[22px] sm:text-[28px] font-medium tracking-[-0.02em] text-foreground/90">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-[13px] text-foreground/50 mt-1">
          Your workspace overview.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={action.href}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors duration-150 group"
            >
              <action.icon className="w-[18px] h-[18px] text-foreground/45 group-hover:text-foreground/50 transition-colors duration-150 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-foreground/80">{action.label}</span>
                <span className="text-[12px] text-foreground/45 ml-2 hidden sm:inline">{action.desc}</span>
              </div>
              <ArrowRight className="w-[14px] h-[14px] text-foreground/10 group-hover:text-foreground/45 transition-colors duration-150" />
            </Link>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 mt-8">
          <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          {/* Activity */}
          <div className="lg:col-span-2">
            <h2 className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground/45 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Recent activity
            </h2>
            <div className="space-y-0">
              {activity.length > 0 ? activity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.04, duration: 0.2 }}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] border-b border-white/[0.03] last:border-b-0 transition-colors duration-150 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/15 flex-shrink-0" />
                    <p className="text-[13px] text-foreground/50 flex-1 min-w-0 truncate">
                      <span className="text-foreground/70 group-hover:text-foreground/90 transition-colors duration-150">{item.text}</span>{" "}
                      <span className="text-foreground/40">{item.target}</span>
                    </p>
                    <span className="text-[11px] text-foreground/30 tabular-nums flex-shrink-0">{timeAgo(item.time)}</span>
                    <ArrowRight className="w-3 h-3 text-foreground/0 group-hover:text-foreground/30 transition-colors duration-150 flex-shrink-0" />
                  </Link>
                </motion.div>
              )) : (
                <p className="text-[13px] text-foreground/40">No recent activity</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div>
              <h2 className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground/45 mb-4">
                At a glance
              </h2>
              <div className="space-y-2.5">
                {[
                  { label: "Projects", value: stats.projects, href: "/projects" },
                  { label: "Open tasks", value: stats.openTasks, href: "/tasks" },
                  { label: "Research pins", value: stats.pins, href: "/research" },
                  { label: "Plans", value: stats.plans, href: "/planning" },
                  { label: "Chat channels", value: stats.channels, href: "/chat" },
                  { label: "Resources", value: stats.resources, href: "/resources" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.04, duration: 0.2 }}
                  >
                    <Link
                      href={stat.href}
                      className="flex items-center justify-between py-1 hover:text-foreground/80 transition-colors duration-150 group"
                    >
                      <span className="text-[13px] text-foreground/50 group-hover:text-foreground/70 transition-colors duration-150">{stat.label}</span>
                      <span className="text-[13px] font-medium text-foreground/60 tabular-nums">{stat.value}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
