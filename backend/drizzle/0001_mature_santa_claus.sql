CREATE TABLE "jobs" (
	"identity_hash" text NOT NULL,
	"company_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"title" text NOT NULL,
	"location" text NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"ingestion_strategy" text NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"raw_data" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_identity_hash_unique" ON "jobs" USING btree ("identity_hash");--> statement-breakpoint
CREATE INDEX "jobs_company_id_idx" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "jobs_is_active_idx" ON "jobs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "jobs_last_seen_at_idx" ON "jobs" USING btree ("last_seen_at");