import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfileTable = pgTable("user_profile", {
  id: integer("id").primaryKey().default(1),
  monthlySalary: numeric("monthly_salary", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  currency: text("currency").notNull().default("JOD"),
  payday: integer("payday").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const updateUserProfileSchema = createInsertSchema(userProfileTable).omit({
  id: true,
  updatedAt: true,
});
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
