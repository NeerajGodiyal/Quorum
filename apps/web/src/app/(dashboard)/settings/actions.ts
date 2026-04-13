"use server";

import { db } from "@oc/db";
import { user } from "@oc/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth-server";
import { headers } from "next/headers";

async function requireAdmin() {
  const headersList = await headers();
  const s = await auth.api.getSession({ headers: headersList });
  if (!s?.user) throw new Error("Unauthorized");
  // Check admin role
  const [u] = await db.select({ role: user.role }).from(user).where(eq(user.id, s.user.id));
  if (u?.role !== "admin") throw new Error("Forbidden: admin required");
  return s.user;
}

async function requireAuth() {
  const headersList = await headers();
  const s = await auth.api.getSession({ headers: headersList });
  if (!s?.user) throw new Error("Unauthorized");
  return s.user;
}

export async function getUsers() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.createdAt);
}

export async function getCurrentUser() {
  const headersList = await headers();
  const s = await auth.api.getSession({ headers: headersList });
  return s?.user ?? null;
}

export async function createMember(data: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}) {
  await requireAdmin();
  const result = await auth.api.signUpEmail({
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  if (!result?.user?.id) {
    throw new Error("Failed to create user");
  }

  // Set role if admin
  if (data.role === "admin") {
    await db
      .update(user)
      .set({ role: "admin" })
      .where(eq(user.id, result.user.id));
  }

  return result.user;
}

export async function updateUserRole(userId: string, role: "admin" | "member") {
  await requireAdmin();
  await db.update(user).set({ role }).where(eq(user.id, userId));
}

export async function removeUser(userId: string) {
  const caller = await requireAdmin();
  if (caller.id === userId) throw new Error("Cannot remove yourself");
  await db.delete(user).where(eq(user.id, userId));
}

export async function updateProfile(userId: string, data: { name: string }) {
  const caller = await requireAuth();
  if (caller.id !== userId) throw new Error("Can only update your own profile");
  await db.update(user).set({ name: data.name }).where(eq(user.id, userId));
}
