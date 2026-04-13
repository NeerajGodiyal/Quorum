"use server";

import { db } from "@oc/db";
import { channels, messages, messageReactions, user } from "@oc/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function getChannels() {
  return db.select().from(channels).orderBy(channels.name);
}

export async function getMessages(channelId: string, limit = 50) {
  return db
    .select({
      id: messages.id,
      content: messages.content,
      createdAt: messages.createdAt,
      userId: messages.userId,
      userName: user.name,
      channelId: messages.channelId,
      parentMessageId: messages.parentMessageId,
    })
    .from(messages)
    .leftJoin(user, eq(messages.userId, user.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function createChannel(name: string, type: "general" | "project" | "direct", createdBy: string) {
  const [channel] = await db
    .insert(channels)
    .values({ name, type, createdBy })
    .returning();
  return channel;
}

export async function sendMessage(channelId: string, userId: string, content: string, parentMessageId?: string) {
  const [msg] = await db
    .insert(messages)
    .values({ channelId, userId, content, parentMessageId: parentMessageId ?? null })
    .returning();
  return msg;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const existing = await db
    .select()
    .from(messageReactions)
    .where(and(eq(messageReactions.messageId, messageId), eq(messageReactions.userId, userId), eq(messageReactions.emoji, emoji)));

  if (existing.length > 0) {
    await db.delete(messageReactions).where(eq(messageReactions.id, existing[0].id));
    return { action: "removed" as const };
  }

  const [reaction] = await db
    .insert(messageReactions)
    .values({ messageId, userId, emoji })
    .returning();
  return { action: "added" as const, reaction };
}

export async function getReactions(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  const results = await db
    .select({
      id: messageReactions.id,
      messageId: messageReactions.messageId,
      userId: messageReactions.userId,
      emoji: messageReactions.emoji,
      userName: user.name,
    })
    .from(messageReactions)
    .leftJoin(user, eq(messageReactions.userId, user.id))
    .where(inArray(messageReactions.messageId, messageIds));

  return results;
}
