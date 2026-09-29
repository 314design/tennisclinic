ALTER TABLE "booking_members" ADD COLUMN "charged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "membership_start" text;