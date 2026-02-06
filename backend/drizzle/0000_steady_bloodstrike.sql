CREATE TABLE "companies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "companies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"company_name" text NOT NULL,
	"career_url" text NOT NULL,
	"source_type" text DEFAULT 'UNKNOWN',
	"ingestion_strategy" text,
	"last_checked_at" timestamp,
	"status" text NOT NULL
);
