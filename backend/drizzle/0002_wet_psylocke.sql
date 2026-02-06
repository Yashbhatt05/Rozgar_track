CREATE TABLE "job_classifications" (
	"identity_hash" text NOT NULL,
	"category" text NOT NULL,
	"role" text NOT NULL,
	"confidence" real NOT NULL,
	"classifier_version" text NOT NULL,
	"classified_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_classifications_identity_hash_unique" ON "job_classifications" USING btree ("identity_hash");--> statement-breakpoint
CREATE INDEX "job_classifications_category_idx" ON "job_classifications" USING btree ("category");--> statement-breakpoint
CREATE INDEX "job_classifications_role_idx" ON "job_classifications" USING btree ("role");