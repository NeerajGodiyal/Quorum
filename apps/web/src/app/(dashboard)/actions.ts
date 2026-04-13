"use server";

import { db } from "@oc/db";
import { tasks, pins, channels, messages, resources, plans, projects, user } from "@oc/db/schema";
import { eq, desc, count, not } from "drizzle-orm";

export async function getDashboardStats() {
  const [taskCount] = await db.select({ value: count() }).from(tasks).where(not(eq(tasks.status, "done")));
  const [pinCount] = await db.select({ value: count() }).from(pins);
  const [channelCount] = await db.select({ value: count() }).from(channels);
  const [resourceCount] = await db.select({ value: count() }).from(resources);
  const [planCount] = await db.select({ value: count() }).from(plans);
  const [projectCount] = await db.select({ value: count() }).from(projects);

  return {
    openTasks: taskCount.value,
    pins: pinCount.value,
    channels: channelCount.value,
    resources: resourceCount.value,
    plans: planCount.value,
    projects: projectCount.value,
  };
}

export async function getRecentActivity() {
  // Get recent tasks
  const recentTasks = await db
    .select({ id: tasks.id, title: tasks.title, createdAt: tasks.createdAt, userName: user.name })
    .from(tasks)
    .leftJoin(user, eq(tasks.createdBy, user.id))
    .orderBy(desc(tasks.createdAt))
    .limit(3);

  // Get recent messages
  const recentMessages = await db
    .select({ id: messages.id, content: messages.content, createdAt: messages.createdAt, userName: user.name, channelId: messages.channelId })
    .from(messages)
    .leftJoin(user, eq(messages.userId, user.id))
    .orderBy(desc(messages.createdAt))
    .limit(2);

  // Get recent pins
  const recentPins = await db
    .select({ id: pins.id, title: pins.title, createdAt: pins.createdAt, userName: user.name })
    .from(pins)
    .leftJoin(user, eq(pins.createdBy, user.id))
    .orderBy(desc(pins.createdAt))
    .limit(2);

  // Combine and sort
  const items = [
    ...recentTasks.map((t) => ({ type: "task" as const, text: `${t.userName} created a task`, target: t.title, href: `/tasks/${t.id}`, time: t.createdAt })),
    ...recentMessages.map((m) => ({ type: "message" as const, text: `${m.userName} messaged`, target: `in chat`, href: `/chat`, time: m.createdAt })),
    ...recentPins.map((p) => ({ type: "pin" as const, text: `${p.userName} pinned`, target: p.title, href: `/research/${p.id}`, time: p.createdAt })),
  ].sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0)).slice(0, 6);

  return items;
}

export async function getTeamMembers() {
  return db.select({ id: user.id, name: user.name, email: user.email, role: user.role }).from(user).orderBy(user.name);
}
