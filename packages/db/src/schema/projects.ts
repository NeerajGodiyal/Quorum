import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("📁"),
  color: text("color").notNull().default("#14F195"),
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  status: text("status", {
    enum: ["active", "paused", "completed", "archived"],
  }).notNull().default("active"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const projectSections = sqliteTable("project_sections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type", {
    enum: ["notes", "links", "architecture", "discussion"],
  }).notNull().default("notes"),
  content: text("content").notNull().default(""),
  canvasData: text("canvas_data").notNull().default("{}"),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
