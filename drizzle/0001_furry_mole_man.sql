CREATE TABLE "session_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_grinds" ADD COLUMN "map" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "active_grinds" ADD COLUMN "is_party" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "grind_sessions" ADD COLUMN "map" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "grind_sessions" ADD COLUMN "is_party" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "grind_sessions" ADD COLUMN "supplies_cost" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "session_drops" ADD CONSTRAINT "session_drops_session_id_grind_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."grind_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_drops_session_idx" ON "session_drops" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_public_slug_unique" UNIQUE("public_slug");