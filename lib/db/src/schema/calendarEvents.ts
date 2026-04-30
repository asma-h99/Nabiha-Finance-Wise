import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calendarEventsTable = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull().$type<"bill" | "subscription" | "loan" | "religious" | "personal" | "education" | "health" | "other">().default("other"),
  amount: numeric("amount", { precision: 14, scale: 3 }),
  currency: text("currency").notNull().default("JOD"),
  categoryId: integer("category_id"),
  recurring: text("recurring").notNull().$type<"none" | "monthly" | "yearly">().default("none"),
  priority: text("priority").notNull().$type<"low" | "normal" | "high">().default("normal"),
  notes: text("notes"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEventsTable.$inferSelect;
