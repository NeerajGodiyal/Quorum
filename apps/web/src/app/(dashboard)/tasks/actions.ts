"use server";

import { db } from "@oc/db";
import { tasks, taskComments, user } from "@oc/db/schema";
import { eq, desc } from "drizzle-orm";
import type { TaskStatus, TaskPriority } from "@oc/shared/types";

export async function getTasks() {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectTag: tasks.projectTag,
      createdAt: tasks.createdAt,
      createdBy: tasks.createdBy,
      assigneeId: tasks.assigneeId,
      assigneeName: user.name,
    })
    .from(tasks)
    .leftJoin(user, eq(tasks.assigneeId, user.id))
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(data: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  projectTag?: string;
  dueDate?: string;
  createdBy: string;
}) {
  const [task] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "backlog",
      priority: data.priority ?? "medium",
      assigneeId: data.assigneeId ?? null,
      projectTag: data.projectTag ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdBy: data.createdBy,
    })
    .returning();
  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
}

export async function updateTask(
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    projectTag: string | null;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db
    .update(tasks)
    .set(updateData as any)
    .where(eq(tasks.id, taskId));
}

export async function deleteTask(taskId: string) {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function getTaskComments(taskId: string) {
  return db
    .select({
      id: taskComments.id,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      userId: taskComments.userId,
      userName: user.name,
    })
    .from(taskComments)
    .leftJoin(user, eq(taskComments.userId, user.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));
}

export async function addTaskComment(taskId: string, userId: string, content: string) {
  const [comment] = await db
    .insert(taskComments)
    .values({ taskId, userId, content })
    .returning();
  return comment;
}

export async function getUsers() {
  return db.select({ id: user.id, name: user.name, email: user.email }).from(user);
}
