CREATE TABLE "adapter_metrics" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adapter_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_id" text NOT NULL,
	"adapter_type" text NOT NULL,
	"company_name" text NOT NULL,
	"source_url" text NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"avg_duration_ms" real DEFAULT 0 NOT NULL,
	"max_duration_ms" integer,
	"browser_fallback_used" boolean DEFAULT false NOT NULL,
	"browser_fallback_count" integer DEFAULT 0 NOT NULL,
	"browser_fallback_rate" real DEFAULT 0 NOT NULL,
	"jobs_fetched" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"last_error" text,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingestion_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"run_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"sources_processed" integer DEFAULT 0 NOT NULL,
	"jobs_fetched" integer DEFAULT 0 NOT NULL,
	"jobs_normalized" integer DEFAULT 0 NOT NULL,
	"jobs_deduplicated" integer DEFAULT 0 NOT NULL,
	"jobs_persisted" integer DEFAULT 0 NOT NULL,
	"jobs_classified" integer DEFAULT 0 NOT NULL,
	"unknown_classifications" integer DEFAULT 0 NOT NULL,
	"missing_locations" integer DEFAULT 0 NOT NULL,
	"duplicate_suppressed" integer DEFAULT 0 NOT NULL,
	"reactivated_jobs" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"context" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ingestion_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE INDEX "adapter_metrics_run_id_idx" ON "adapter_metrics" USING btree ("run_id");
--> statement-breakpoint
CREATE INDEX "adapter_metrics_adapter_type_idx" ON "adapter_metrics" USING btree ("adapter_type");
--> statement-breakpoint
CREATE INDEX "adapter_metrics_company_name_idx" ON "adapter_metrics" USING btree ("company_name");
--> statement-breakpoint
CREATE INDEX "ingestion_runs_status_idx" ON "ingestion_runs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "ingestion_runs_started_at_idx" ON "ingestion_runs" USING btree ("started_at");