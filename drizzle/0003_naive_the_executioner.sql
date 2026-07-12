ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_sub" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "user_google_sub_unique" ON "user" USING btree ("google_sub");