"use server";

import { db } from "@oc/db";
import { plans, planSections, user } from "@oc/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getPlans() {
  return db
    .select({
      id: plans.id,
      title: plans.title,
      type: plans.type,
      mode: plans.mode,
      description: plans.description,
      status: plans.status,
      createdBy: plans.createdBy,
      createdAt: plans.createdAt,
      authorName: user.name,
    })
    .from(plans)
    .leftJoin(user, eq(plans.createdBy, user.id))
    .orderBy(desc(plans.createdAt));
}

export async function createPlan(data: {
  title: string;
  type: "architecture" | "design" | "research" | "general";
  mode?: "text" | "canvas" | "diagram";
  description?: string;
  createdBy: string;
}) {
  const [plan] = await db
    .insert(plans)
    .values({
      title: data.title,
      type: data.type,
      mode: data.mode ?? "text",
      description: data.description ?? null,
      createdBy: data.createdBy,
    })
    .returning();
  return plan;
}

export async function getPlan(id: string) {
  const [plan] = await db
    .select({
      id: plans.id,
      title: plans.title,
      type: plans.type,
      mode: plans.mode,
      canvasData: plans.canvasData,
      description: plans.description,
      status: plans.status,
      createdBy: plans.createdBy,
      createdAt: plans.createdAt,
      updatedAt: plans.updatedAt,
      authorName: user.name,
    })
    .from(plans)
    .leftJoin(user, eq(plans.createdBy, user.id))
    .where(eq(plans.id, id));
  return plan ?? null;
}

export async function updatePlan(id: string, data: Partial<{ title: string; description: string; status: string; type: string; mode: string; canvasData: string }>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(plans).set(updateData as any).where(eq(plans.id, id));
}

export async function getPlanSections(planId: string) {
  return db.select().from(planSections).where(eq(planSections.planId, planId)).orderBy(planSections.order);
}

export async function addPlanSection(planId: string, title: string, content: string, order: number) {
  const [section] = await db.insert(planSections).values({ planId, title, content, order }).returning();
  return section;
}

export async function updatePlanSection(id: string, data: Partial<{ title: string; content: string }>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(planSections).set(updateData as any).where(eq(planSections.id, id));
}

export async function deletePlanSection(id: string) {
  await db.delete(planSections).where(eq(planSections.id, id));
}

export async function deletePlan(id: string) {
  await db.delete(plans).where(eq(plans.id, id));
}
