ALTER TABLE "app_config" DROP CONSTRAINT "app_config_single_row_check";--> statement-breakpoint
ALTER TABLE "app_config" DROP CONSTRAINT "app_config_pkey";--> statement-breakpoint
ALTER TABLE "app_config" ADD COLUMN "new_id" uuid;--> statement-breakpoint
UPDATE "app_config" SET "new_id" = '00000000-0000-4000-8000-000000000301' WHERE "new_id" IS NULL;--> statement-breakpoint
ALTER TABLE "app_config" ALTER COLUMN "new_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app_config" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "app_config" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "app_config" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "app_config" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "question_code" varchar(64);--> statement-breakpoint
UPDATE "questions" SET "question_code" = "id" WHERE "question_code" IS NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "new_id" uuid;--> statement-breakpoint
UPDATE "questions" SET "new_id" = gen_random_uuid() WHERE "new_id" IS NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "deck_uuid" uuid[];--> statement-breakpoint
UPDATE "rooms" r
SET "deck_uuid" = COALESCE(
  (
    SELECT array_agg(q."new_id" ORDER BY item.ord)
    FROM unnest(r."deck") WITH ORDINALITY AS item(question_code, ord)
    JOIN "questions" q ON q."question_code" = item.question_code
  ),
  ARRAY[]::uuid[]
);--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "favorites_uuid" uuid[];--> statement-breakpoint
UPDATE "rooms" r
SET "favorites_uuid" = COALESCE(
  (
    SELECT array_agg(q."new_id" ORDER BY item.ord)
    FROM unnest(r."favorites") WITH ORDINALITY AS item(question_code, ord)
    JOIN "questions" q ON q."question_code" = item.question_code
  ),
  ARRAY[]::uuid[]
);--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "deck_uuid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "favorites_uuid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" DROP COLUMN "deck";--> statement-breakpoint
ALTER TABLE "rooms" DROP COLUMN "favorites";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "deck_uuid" TO "deck";--> statement-breakpoint
ALTER TABLE "rooms" RENAME COLUMN "favorites_uuid" TO "favorites";--> statement-breakpoint
ALTER TABLE "rooms" ALTER COLUMN "favorites" SET DEFAULT ARRAY[]::uuid[];--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "new_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_pkey";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "questions" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "questions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_code_unique" UNIQUE("question_code");
