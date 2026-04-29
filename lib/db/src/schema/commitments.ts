import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const commitmentsTable = pgTable("commitments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDay: integer("due_day").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommitmentSchema = createInsertSchema(commitmentsTable).omit({ id: true, userId: true, createdAt: true });
export type InsertCommitment = z.infer<typeof insertCommitmentSchema>;
export type Commitment = typeof commitmentsTable.$inferSelect;
