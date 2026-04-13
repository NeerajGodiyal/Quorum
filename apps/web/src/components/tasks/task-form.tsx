"use client";

import { useState } from "react";
import { createTask } from "@/app/(dashboard)/tasks/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

export function TaskForm({
  users,
  currentUserId,
  onCreated,
  onCancel,
}: {
  users: User[];
  currentUserId: string;
  onCreated: (task: any) => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "backlog",
    assigneeId: "",
    projectTag: "",
    dueDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const task = await createTask({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority as any,
        status: form.status as any,
        assigneeId: form.assigneeId || undefined,
        projectTag: form.projectTag || undefined,
        dueDate: form.dueDate || undefined,
        createdBy: currentUserId,
      });
      onCreated(task);
      setForm({ title: "", description: "", priority: "medium", status: "backlog", assigneeId: "", projectTag: "", dueDate: "" });
    } finally {
      setLoading(false);
    }
  };

  const selectClass = "w-full h-9 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 text-[13px] text-foreground/70 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div className="border border-white/[0.06] rounded-xl p-4 bg-white/[0.015]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-medium text-foreground/70">New task</h3>
        <button onClick={onCancel} className="text-foreground/40 hover:text-foreground/50 transition-colors duration-150">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-[12px] text-foreground/50 mb-1 block">Title</Label>
            <Input
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
              required
              autoFocus
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-[12px] text-foreground/50 mb-1 block">Description</Label>
            <Textarea
              placeholder="Optional details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] min-h-[60px]"
            />
          </div>

          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Priority</Label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={selectClass}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Status</Label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={selectClass}>
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Assign to</Label>
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={selectClass}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Project</Label>
            <Input
              placeholder="e.g. Frontend"
              value={form.projectTag}
              onChange={(e) => setForm({ ...form, projectTag: e.target.value })}
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12]"
            />
          </div>

          <div>
            <Label className="text-[12px] text-foreground/50 mb-1 block">Due Date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="h-9 text-[13px] bg-white/[0.02] border-white/[0.06] focus:border-white/[0.12] [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-[13px] text-foreground/50 hover:text-foreground/50 transition-colors duration-150">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-[13px] font-medium text-foreground/70 transition-all duration-150 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
