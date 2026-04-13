"use server";

import { db } from "@oc/db";
import { resources } from "@oc/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getResources() {
  return db.select().from(resources).orderBy(desc(resources.createdAt));
}

export async function createResource(data: {
  name: string;
  type: "person" | "tool" | "budget" | "document" | "other";
  description?: string;
  url?: string;
  tags?: string[];
  capacity?: number;
  createdBy: string;
}) {
  const [resource] = await db
    .insert(resources)
    .values({
      name: data.name,
      type: data.type,
      description: data.description ?? null,
      url: data.url ?? null,
      tags: JSON.stringify(data.tags ?? []),
      capacity: data.capacity ?? null,
      createdBy: data.createdBy,
    })
    .returning();
  return resource;
}

export async function getResource(id: string) {
  const [resource] = await db.select().from(resources).where(eq(resources.id, id));
  return resource ?? null;
}

export async function updateResource(id: string, data: Partial<{ name: string; description: string; type: string; url: string; tags: string; capacity: number }>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  await db.update(resources).set(updateData as any).where(eq(resources.id, id));
}

export async function deleteResource(id: string) {
  await db.delete(resources).where(eq(resources.id, id));
}
