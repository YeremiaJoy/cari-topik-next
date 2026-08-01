CREATE TYPE "public"."room_pool" AS ENUM('deck', 'flag');--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "flag_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "flag_reserve" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "flag_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "current_pool" "room_pool" DEFAULT 'deck' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "flag_votes" jsonb DEFAULT '{}'::jsonb NOT NULL;