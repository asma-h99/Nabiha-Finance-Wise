-- Add one-time and scope fields to existing commitments table
ALTER TABLE "commitments"
  ADD COLUMN IF NOT EXISTS "is_one_time" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "one_time_month" text;

--> statement-breakpoint

-- Create commitment_skips table for per-month skip exceptions on recurring commitments
CREATE TABLE IF NOT EXISTS "commitment_skips" (
  "id" serial PRIMARY KEY NOT NULL,
  "commitment_id" integer NOT NULL,
  "month" text NOT NULL,
  CONSTRAINT "commitment_skips_unique" UNIQUE("commitment_id","month")
);

--> statement-breakpoint

-- Add foreign key from commitment_skips to commitments (cascade delete)
DO $$ BEGIN
  ALTER TABLE "commitment_skips"
    ADD CONSTRAINT "commitment_skips_commitment_id_commitments_id_fk"
    FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
