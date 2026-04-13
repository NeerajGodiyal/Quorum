"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTasks, updateTask, deleteTask, getTaskComments, addTaskComment, getUsers } from "../actions";
import { useSession } from "@/lib/auth-client";
import { ArrowLeft, Loader2, Trash2, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task { id: string; title: string; description: string | null; status: string; priority: string; projectTag: string | null; assigneeId: string | null; assigneeName: string | null; dueDate: Date | null; createdBy: string; createdAt: Date; }
interface Comment { id: string; content: string; createdAt: Date; userId: string; userName: string | null; }
interface User { id: string; name: string; email: string; }

const priorityColors: Record<string, string> = { urgent: "bg-red-500", high: "bg-orange-400", medium: "bg-blue-400", low: "bg-emerald-400" };

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("backlog");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [commentInput, setCommentInput] = useState("");

  useEffect(() => {
    Promise.all([getTasks(), getTaskComments(taskId), getUsers()]).then(([tasks, c, u]) => {
      const t = (tasks as Task[]).find((t) => t.id === taskId);
      if (!t) { router.push("/tasks"); return; }
      setTask(t);
      setTitle(t.title);
      setDescription(t.description ?? "");
      setStatus(t.status);
      setPriority(t.priority);
      setAssigneeId(t.assigneeId ?? "");
      setComments(c as Comment[]);
      setUsers(u as User[]);
      setLoading(false);
    });
  }, [taskId, router]);

  const save = async (overrides?: Record<string, any>) => {
    await updateTask(taskId, { title, description: description || undefined, status: status as any, priority: priority as any, assigneeId: assigneeId || null, ...overrides });
  };

  const remove = async () => {
    await deleteTask(taskId);
    router.push("/tasks");
  };

  const sendComment = async () => {
    if (!commentInput.trim() || !session?.user) return;
    const c = await addTaskComment(taskId, session.user.id, commentInput.trim());
    setComments((prev) => [{ ...c, userName: session.user.name } as Comment, ...prev]);
    setCommentInput("");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-5 h-5 animate-spin text-foreground/40" /></div>;
  }

  const selectClass = "h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-foreground/50 focus:outline-none focus:border-white/[0.12] transition-colors duration-150";

  return (
    <div className="">
      <button onClick={() => router.push("/tasks")} className="flex items-center gap-1.5 text-[13px] text-foreground/50 hover:text-foreground/60 transition-colors duration-150 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Tasks
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save()}
            className="text-[22px] font-medium tracking-[-0.02em] text-foreground/90 bg-transparent border-none outline-none w-full placeholder:text-foreground/40"
            placeholder="Task title"
          />

          {task?.projectTag && (
            <span className="text-[11px] text-foreground/40 uppercase tracking-[0.06em] mt-1 inline-block">{task.projectTag}</span>
          )}

          <div className="mt-4 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save()}
              className="text-[14px] text-foreground/60 bg-transparent border-none outline-none w-full min-h-[120px] resize-none leading-relaxed placeholder:text-foreground/35"
              placeholder="Add a description..."
            />
          </div>

          {/* Comments */}
          <div className="mt-8">
            <h3 className="text-[11px] font-medium tracking-[0.08em] uppercase text-foreground/45 mb-3 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Comments
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Write a comment..."
                className="flex-1 h-9 px-3 text-[13px] bg-white/[0.02] border border-white/[0.06] rounded-lg text-foreground/60 placeholder:text-foreground/35 focus:outline-none focus:border-white/[0.12] transition-colors duration-150"
              />
              <button onClick={sendComment} className="h-9 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-foreground/40 transition-all duration-150">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-white/[0.04] flex items-center justify-center text-[9px] font-medium text-foreground/50 flex-shrink-0 mt-0.5">
                      {c.userName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? ""}
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12px] font-medium text-foreground/50">{c.userName}</span>
                        <span className="text-[10px] text-foreground/35">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[13px] text-foreground/50 mt-0.5 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-foreground/35">No comments yet</p>
            )}
          </div>
        </div>

        {/* Sidebar meta */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 space-y-3">
            <div>
              <label className="text-[11px] text-foreground/45 mb-1.5 block">Status</label>
              <select value={status} onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }); }} className={cn(selectClass, "w-full")}>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-foreground/45 mb-1.5 block">Priority</label>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", priorityColors[priority])} />
                <select value={priority} onChange={(e) => { setPriority(e.target.value); save({ priority: e.target.value }); }} className={cn(selectClass, "flex-1")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-foreground/45 mb-1.5 block">Assignee</label>
              <select value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); save({ assigneeId: e.target.value || null }); }} className={cn(selectClass, "w-full")}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-foreground/35 space-y-1">
            <p>Created {task?.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}</p>
          </div>

          <button onClick={remove} className="text-[12px] text-foreground/35 hover:text-red-400/70 transition-colors duration-150">
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
}
