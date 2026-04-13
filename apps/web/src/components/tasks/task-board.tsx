"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { TaskCard } from "./task-card";
import { TaskForm } from "./task-form";
import { updateTaskStatus } from "@/app/(dashboard)/tasks/actions";
import { cn } from "@/lib/utils";
import { Plus, List, LayoutGrid, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TaskStatus } from "@oc/shared/types";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  projectTag?: string | null;
  assigneeName?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | null;
  createdBy: string;
  createdAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const columns: { key: TaskStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export function TaskBoard({
  initialTasks,
  users,
  currentUserId,
  onTasksChange,
}: {
  initialTasks: Task[];
  users: User[];
  currentUserId: string;
  onTasksChange?: (tasks: Task[]) => void;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    onTasksChange?.(newTasks);
  };

  const filteredTasks = filterUser
    ? tasks.filter((t) => t.assigneeId === filterUser)
    : tasks;

  const tasksByColumn = (status: string) =>
    filteredTasks.filter((t) => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      setDraggingId(null);
      const taskId = e.dataTransfer.getData("taskId");
      if (!taskId) return;
      updateTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      await updateTaskStatus(taskId, newStatus);
    },
    [tasks]
  );

  const handleTaskCreated = (newTask: Task) => {
    const assignee = users.find((u) => u.id === newTask.assigneeId);
    updateTasks([{ ...newTask, assigneeName: assignee?.name ?? null }, ...tasks]);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90">Tasks</h1>
          <p className="text-[13px] text-foreground/50 mt-0.5">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {filterUser && " filtered"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Team filter */}
          <div className="flex items-center gap-1 border border-white/[0.06] rounded-lg p-0.5">
            <button
              onClick={() => setFilterUser(null)}
              className={cn(
                "px-2 py-1 rounded-md text-[11px] font-medium transition-colors duration-150",
                !filterUser ? "bg-white/[0.08] text-foreground/70" : "text-foreground/50 hover:text-foreground/50"
              )}
            >
              All
            </button>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setFilterUser(filterUser === u.id ? null : u.id)}
                title={u.name}
                className="rounded-md"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className={cn("text-[9px] font-medium transition-colors duration-150", filterUser === u.id ? "bg-white/[0.12] text-foreground/70 ring-1 ring-[#14F195]/40" : "bg-white/[0.03] text-foreground/40")}>
                    {u.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>

          {/* View toggle — no animation, instant switch */}
          <div className="hidden sm:flex items-center border border-white/[0.06] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("board")}
              className={cn("p-1.5 rounded-md", viewMode === "board" ? "bg-white/[0.08] text-foreground/60" : "text-foreground/35 hover:text-foreground/50")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md", viewMode === "list" ? "bg-white/[0.08] text-foreground/60" : "text-foreground/35 hover:text-foreground/50")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              const csvRows = [
                ["Title", "Status", "Priority", "Assignee", "Project", "Due Date", "Created"].join(","),
                ...filteredTasks.map((t) => [
                  `"${(t.title ?? "").replace(/"/g, '""')}"`,
                  t.status,
                  t.priority,
                  `"${t.assigneeName ?? "Unassigned"}"`,
                  `"${t.projectTag ?? ""}"`,
                  t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
                  new Date(t.createdAt).toLocaleDateString(),
                ].join(",")),
              ];
              const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-[13px] text-foreground/40 transition-colors duration-150"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Form — no fade in for keyboard-triggered (it's a click, so brief animate) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <TaskForm users={users} currentUserId={currentUserId} onCreated={handleTaskCreated} onCancel={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      {viewMode === "board" ? (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex gap-2.5 min-w-[800px]">
            {columns.map((col) => {
              const colTasks = tasksByColumn(col.key);
              const isDragOver = dragOverColumn === col.key;
              return (
                <div
                  key={col.key}
                  onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={cn(
                    "flex-1 min-w-[180px] rounded-xl p-2.5 min-h-[400px] transition-all duration-300 ease-out",
                    isDragOver ? "bg-white/[0.04] ring-1 ring-inset ring-[#14F195]/20 scale-[1.01]" : "",
                    draggingId && !isDragOver ? "opacity-80" : ""
                  )}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1.5 py-1">
                    <span className="text-[11px] font-medium text-foreground/45 uppercase tracking-[0.04em]">{col.label}</span>
                    <span className="text-[10px] text-foreground/20 tabular-nums ml-auto">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {colTasks.map((task, i) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "cursor-grab active:cursor-grabbing transition-all duration-200",
                            draggingId === task.id ? "opacity-40 scale-[0.97]" : "opacity-100"
                          )}
                          style={{ transition: "opacity 0.2s, transform 0.2s" }}
                        >
                          <TaskCard task={task} index={i} onClick={() => router.push(`/tasks/${task.id}`)} />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Empty column hint */}
                  {colTasks.length === 0 && (
                    <div className={cn(
                      "rounded-xl border border-dashed py-10 text-center transition-all duration-300",
                      isDragOver ? "border-[#14F195]/30 bg-[#14F195]/[0.03]" : "border-white/[0.04]"
                    )}>
                      <p className={cn("text-[11px] transition-colors duration-300", isDragOver ? "text-foreground/40" : "text-foreground/15")}>
                        {isDragOver ? "Release to move here" : "No tasks"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {columns.map((col) => {
            const colTasks = tasksByColumn(col.key);
            if (colTasks.length === 0) return null;
            return (
              <div key={col.key}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-medium text-foreground/45 uppercase tracking-[0.04em]">{col.label}</span>
                  <span className="text-[10px] text-foreground/20 tabular-nums">{colTasks.length}</span>
                </div>
                <div className="space-y-1">
                  {colTasks.map((task, i) => (
                    <TaskCard key={task.id} task={task} index={i} compact onClick={() => router.push(`/tasks/${task.id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
