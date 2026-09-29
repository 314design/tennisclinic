CREATE TABLE "package_members" (
	"package_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	CONSTRAINT "package_members_package_id_member_id_pk" PRIMARY KEY("package_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" integer,
	"people_count" integer NOT NULL,
	"sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"makeup_sessions" integer DEFAULT 0 NOT NULL,
	"band" text NOT NULL,
	"exclusive" boolean DEFAULT false NOT NULL,
	"price" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"fixed_weekday" integer,
	"fixed_start" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"effective_from" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "package_id" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "exclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "series_id" text;--> statement-breakpoint
ALTER TABLE "package_members" ADD CONSTRAINT "package_members_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_members" ADD CONSTRAINT "package_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;