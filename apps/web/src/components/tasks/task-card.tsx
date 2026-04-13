"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    priority: string;
    projectTag?: string | null;
    assigneeName?: string | null;
    dueDate?: Date | null;
  };
  index?: number;
  onClick?: () => void;
  compact?: boolean;
}

// Subtle priority colors — just enough to scan
const priorityStyle: Record<string, string> = {
  urgent: "text-red-400/80 bg-red-400/8",
  high: "text-orange-400/70 bg-orange-400/8",
  medium: "text-blue-400/60 bg-blue-400/8",
  low: "text-foreground/35 bg-white/[0.03]",
};

// Consistent avatar colors based on first letter
const avatarColors = [
  "bg-[#14F195]/15 text-[#14F195]/80",
  "bg-blue-400/15 text-blue-400/80",
  "bg-purple-400/15 text-purple-400/80",
  "bg-orange-400/15 text-orange-400/80",
  "bg-pink-400/15 text-pink-400/80",
];

function getAvatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return avatarColors[code % avatarColors.length];
}

// Tag color — muted tint based on tag name
const tagColors: Record<string, string> = {
  mithril: "text-[#14F195]/60",
  validator: "text-blue-400/50",
  infra: "text-purple-400/50",
  devops: "text-orange-400/50",
  website: "text-pink-400/50",
  strategy: "text-amber-400/50",
  bug: "text-red-400/60",
};

function getTagColor(tag: string) {
  return tagColors[tag.toLowerCase()] ?? "text-foreground/35";
}

export function TaskCard({ task, index = 0, onClick, compact }: TaskCardProps) {
  const initials = task.assigneeName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dueLabel = (() => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    const overdue = due < new Date();
    return {
      text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      overdue,
    };
  })();

  // ── LIST VIEW ──
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group"
      >
        <span className="text-[13px] text-foreground/70 group-hover:text-foreground/85 flex-1 truncate transition-colors duration-150">
          {task.title}
        </span>
        {task.projectTag && (
          <span className={cn("text-[11px] hidden sm:inline flex-shrink-0 uppercase tracking-[0.04em]", getTagColor(task.projectTag))}>
            {task.projectTag}
          </span>
        )}
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded hidden sm:inline flex-shrink-0", priorityStyle[task.priority] ?? priorityStyle.medium)}>
          {task.priority}
        </span>
        {dueLabel && (
          <span className={cn("flex items-center gap-1 text-[11px] flex-shrink-0 hidden sm:flex", dueLabel.overdue ? "text-red-400/60" : "text-foreground/25")}>
            <Calendar className="w-2.5 h-2.5" />
            {dueLabel.text}
          </span>
        )}
        {initials && (
          <Avatar className="w-5 h-5 flex-shrink-0">
            <AvatarFallback className={cn("text-[8px] font-medium", getAvatarColor(task.assigneeName ?? ""))}>{initials}</AvatarFallback>
          </Avatar>
        )}
      </motion.div>
    );
  }

  // ── KANBAN CARD ──
  return (
    <motion.div
      layout
      layoutId={task.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }, delay: index * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="rounded-xl bg-white/[0.03] backdrop-blur-[2px] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] px-3.5 py-3 cursor-pointer transition-all duration-200 group/card"
    >
      {/* Header — tag + assignee */}
      <div className="flex items-center justify-between mb-2">
        {task.projectTag ? (
          <span className={cn("text-[10px] uppercase tracking-[0.06em] font-medium", getTagColor(task.projectTag))}>
            {task.projectTag}
          </span>
        ) : <span />}
        {initials && (
          <Avatar className="w-5 h-5 opacity-70 group-hover/card:opacity-100 transition-opacity duration-150">
            <AvatarFallback className={cn("text-[8px] font-medium", getAvatarColor(task.assigneeName ?? ""))}>{initials}</AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-medium text-foreground/80 leading-[1.45] line-clamp-2">
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-[12px] text-foreground/35 mt-1.5 line-clamp-2 leading-[1.5]">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/[0.04]">
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", priorityStyle[task.priority] ?? priorityStyle.medium)}>
          {task.priority}
        </span>
        {dueLabel && (
          <span className={cn("flex items-center gap-1 text-[10px]", dueLabel.overdue ? "text-red-400/60" : "text-foreground/25")}>
            <Calendar className="w-2.5 h-2.5" />
            {dueLabel.text}
          </span>
        )}
      </div>
    </motion.div>
  );
}
