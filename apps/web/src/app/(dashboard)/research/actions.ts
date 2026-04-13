"use server";

import { db } from "@oc/db";
import { pins } from "@oc/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getPins() {
  return db.select().from(pins).orderBy(desc(pins.createdAt));
}

export async function createPin(data: {
  title: string;
  url?: string;
  description?: string;
  content?: string;
  tags?: string[];
  color?: string;
  createdBy: string;
}) {
  const [pin] = await db
    .insert(pins)
    .values({
      title: data.title,
      url: data.url ?? null,
      description: data.description ?? null,
      content: data.content ?? null,
      tags: JSON.stringify(data.tags ?? []),
      color: data.color ?? "#3B82F6",
      createdBy: data.createdBy,
    })
    .returning();
  return pin;
}

export async function getPin(id: string) {
  const [pin] = await db.select().from(pins).where(eq(pins.id, id));
  return pin ?? null;
}

export async function deletePin(id: string) {
  await db.delete(pins).where(eq(pins.id, id));
}

export async function updatePin(id: string, data: Partial<{ title: string; description: string; content: string; url: string; tags: string[]; color: string }>) {
  const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.tags) updates.tags = JSON.stringify(data.tags);
  await db.update(pins).set(updates).where(eq(pins.id, id));
}
