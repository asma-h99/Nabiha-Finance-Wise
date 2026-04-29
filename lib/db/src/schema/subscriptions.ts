import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: text("frequency").notNull().$type<"monthly" | "yearly" | "weekly">(),
  category: text("category").notNull().$type<"streaming" | "music" | "productivity" | "fitness" | "other">().default("other"),
  nextRenewalDate: text("next_renewal_date").notNull(),
  status: text("status").notNull().$type<"active" | "inactive" | "upcoming">().default("active"),
  brandColor: text("brand_color"),
  brandIcon: text("brand_icon"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, userId: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
