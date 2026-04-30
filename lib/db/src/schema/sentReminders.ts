import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const sentRemindersTable = pgTable(
  "sent_reminders",
  {
    id: serial("id").primaryKey(),
    commitmentId: integer("commitment_id").notNull(),
    dueDateKey: text("due_date_key").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    commitmentDueUnique: uniqueIndex("sent_reminders_commitment_due_idx").on(
      table.commitmentId,
      table.dueDateKey,
    ),
  }),
);

export type SentReminder = typeof sentRemindersTable.$inferSelect;
