ALTER TABLE "members" ALTER COLUMN "permission" SET DEFAULT 'read';--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "permission" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recovery_codes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timestamp_map" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timestamp_map" ALTER COLUMN "timestamp_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recovery_codes" ADD COLUMN "used" boolean DEFAULT false;