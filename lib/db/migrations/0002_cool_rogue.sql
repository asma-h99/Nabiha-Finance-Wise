ALTER TABLE "commitments" ADD COLUMN "category_id" integer;
--> statement-breakpoint
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
