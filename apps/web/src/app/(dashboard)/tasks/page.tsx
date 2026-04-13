"use client";

import { useEffect, useState } from "react";
import { TaskBoard } from "@/components/tasks/task-board";
import { getTasks, getUsers } from "./actions";
import { useSession } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export default function TasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    Promise.all([getTasks(), getUsers()])
      .then(([t, u]) => {
        setTasks(t);
        setUsers(u);
      })
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <TaskBoard
      initialTasks={tasks}
      users={users}
      currentUserId={session!.user.id}
      onTasksChange={setTasks}
    />
  );
}
