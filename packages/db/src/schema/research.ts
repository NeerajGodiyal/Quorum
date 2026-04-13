import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const pins = sqliteTable("pins", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  url: text("url"),
  description: text("description"),
  content: text("content"), // rich text / notes
  thumbnail: text("thumbnail"),
  tags: text("tags").notNull().default("[]"), // JSON array of tags
  color: text("color").default("#3B82F6"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
