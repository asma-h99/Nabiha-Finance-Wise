import { pgTable, text, serial, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { commitmentsTable } from "./commitments";

export const commitmentSkipsTable = pgTable(
  "commitment_skips",
  {
    id: serial("id").primaryKey(),
    commitmentId: integer("commitment_id")
      .notNull()
      .references(() => commitmentsTable.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
  },
  (t) => [unique("commitment_skips_unique").on(t.commitmentId, t.month)],
);

export const insertCommitmentSkipSchema = createInsertSchema(commitmentSkipsTable).omit({ id: true });
export type InsertCommitmentSkip = z.infer<typeof insertCommitmentSkipSchema>;
export type CommitmentSkip = typeof commitmentSkipsTable.$inferSelect;
