"use server";

import { db } from "@oc/db";
import { projects, projectSections, user } from "@oc/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getProjects() {
  return db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      icon: projects.icon,
      color: projects.color,
      starred: projects.starred,
      status: projects.status,
      createdAt: projects.createdAt,
      authorName: user.name,
    })
    .from(projects)
    .leftJoin(user, eq(projects.createdBy, user.id))
    .orderBy(desc(projects.starred), desc(projects.createdAt));
}

export async function createProject(data: {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  createdBy: string;
}) {
  const [project] = await db
    .insert(projects)
    .values({
      title: data.title,
      description: data.description ?? null,
      icon: data.icon ?? "📁",
      color: data.color ?? "#14F195",
      createdBy: data.createdBy,
    })
    .returning();
  return project;
}

export async function getProject(id: string) {
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      icon: projects.icon,
      color: projects.color,
      starred: projects.starred,
      status: projects.status,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      authorName: user.name,
    })
    .from(projects)
    .leftJoin(user, eq(projects.createdBy, user.id))
    .where(eq(projects.id, id));
  return project ?? null;
}

export async function updateProject(id: string, data: Partial<{ title: string; description: string; icon: string; color: string; status: string }>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(projects).set(updateData as any).where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
}

export async function toggleStar(id: string) {
  const [project] = await db.select({ starred: projects.starred }).from(projects).where(eq(projects.id, id));
  if (!project) return;
  await db.update(projects).set({ starred: !project.starred, updatedAt: new Date() } as any).where(eq(projects.id, id));
  return !project.starred;
}

export async function getProjectSections(projectId: string) {
  return db
    .select()
    .from(projectSections)
    .where(eq(projectSections.projectId, projectId))
    .orderBy(projectSections.order);
}

export async function addProjectSection(projectId: string, title: string, type: string, order: number) {
  const [section] = await db
    .insert(projectSections)
    .values({ projectId, title, type: type as any, order })
    .returning();
  return section;
}

export async function updateProjectSection(id: string, data: Partial<{ title: string; content: string; canvasData: string; type: string }>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(projectSections).set(updateData as any).where(eq(projectSections.id, id));
}

export async function deleteProjectSection(id: string) {
  await db.delete(projectSections).where(eq(projectSections.id, id));
}
