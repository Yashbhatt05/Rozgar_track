import { pgTable, text, integer, timestamp, boolean, jsonb, index, uniqueIndex, real, bigint } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  company_name: text('company_name').notNull(),
  career_url: text('career_url').notNull(),
  source_type: text('source_type').default('UNKNOWN'),
  ingestion_strategy: text('ingestion_strategy'),
  last_checked_at: timestamp('last_checked_at'),
  status: text('status').notNull(),
});

/**
 * Jobs table - Persistent, authoritative source for job lifecycle
 * 
 * Invariant: For any identity_hash, there is exactly one row
 * representing the full lifecycle of that job.
 */
export const jobs = pgTable(
  'jobs',
  {
    // Identity & Reference
    identity_hash: text('identity_hash').notNull(),
    company_id: integer('company_id').notNull(),
    company_name: text('company_name').notNull(),

    // Core job data
    title: text('title').notNull(),
    location: text('location').notNull(),
    url: text('url').notNull(),

    // Source tracking
    source_type: text('source_type').notNull(),
    ingestion_strategy: text('ingestion_strategy').notNull(),

    // Temporal state
    first_seen_at: timestamp('first_seen_at', { withTimezone: true }).notNull(),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    is_active: boolean('is_active').notNull().default(true),

    // Metadata
    raw_data: jsonb('raw_data'),
    metadata: jsonb('metadata'),

    // Audit
    created_at: timestamp('created_at', { withTimezone: true }).notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    // Unique constraint on identity_hash
    identityHashUnique: uniqueIndex('jobs_identity_hash_unique').on(table.identity_hash),

    // Query optimization indexes
    companyIdIdx: index('jobs_company_id_idx').on(table.company_id),
    isActiveIdx: index('jobs_is_active_idx').on(table.is_active),
    lastSeenAtIdx: index('jobs_last_seen_at_idx').on(table.last_seen_at),
  })
);

/**
 * Job Classification table - Software vs Non-software categorization
 * 
 * Separate from jobs table to keep concerns isolated.
 * Can be recomputed/upgraded without affecting job records.
 */
export const jobClassifications = pgTable(
  'job_classifications',
  {
    // Reference to job
    identity_hash: text('identity_hash').notNull(),

    // Classification result
    category: text('category').notNull(), // SOFTWARE | NON_SOFTWARE | UNKNOWN
    role: text('role').notNull(), // frontend | backend | data | devops | other | unknown
    confidence: real('confidence').notNull(), // 0.0 - 1.0

    // Versioning & Audit
    classifier_version: text('classifier_version').notNull(),
    classified_at: timestamp('classified_at', { withTimezone: true }).notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    // Unique: one classification per job
    identityHashUnique: uniqueIndex('job_classifications_identity_hash_unique').on(
      table.identity_hash
    ),

    // Query optimization
    categoryIdx: index('job_classifications_category_idx').on(table.category),
    roleIdx: index('job_classifications_role_idx').on(table.role),
  })
);

/**
 * Ingestion Runs - Track each pipeline execution
 *
 * Purpose:
 * - Audit trail of all ingestion operations
 * - Performance metrics over time
 * - Detect quality degradation
 */
export const ingestionRuns = pgTable(
  'ingestion_runs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),

    // Run metadata
    run_id: text('run_id').notNull().unique(), // UUID or timestamp-based ID
    started_at: timestamp('started_at', { withTimezone: true }).notNull(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    duration_ms: integer('duration_ms'),

    // Ingestion metrics
    sources_processed: integer('sources_processed').notNull().default(0),
    jobs_fetched: integer('jobs_fetched').notNull().default(0),
    jobs_normalized: integer('jobs_normalized').notNull().default(0),
    jobs_deduplicated: integer('jobs_deduplicated').notNull().default(0),
    jobs_persisted: integer('jobs_persisted').notNull().default(0),
    jobs_classified: integer('jobs_classified').notNull().default(0),

    // Quality signals
    unknown_classifications: integer('unknown_classifications').notNull().default(0),
    missing_locations: integer('missing_locations').notNull().default(0),
    duplicate_suppressed: integer('duplicate_suppressed').notNull().default(0),
    reactivated_jobs: integer('reactivated_jobs').notNull().default(0),

    // Status
    status: text('status').notNull(), // pending | completed | failed
    error_message: text('error_message'),

    // Context
    context: jsonb('context'), // Additional metadata

    // Audit
    created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    runIdIdx: uniqueIndex('ingestion_runs_run_id_unique').on(table.run_id),
    statusIdx: index('ingestion_runs_status_idx').on(table.status),
    startedAtIdx: index('ingestion_runs_started_at_idx').on(table.started_at),
  })
);

/**
 * Adapter Health - Track per-adapter performance
 *
 * Purpose:
 * - Identify failing sources
 * - Monitor cost (browser fallback, retries)
 * - Detect quality issues early
 */
export const adapterMetrics = pgTable(
  'adapter_metrics',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),

    // Reference to run
    run_id: text('run_id').notNull(),

    // Adapter info
    adapter_type: text('adapter_type').notNull(), // PLATFORM_ADAPTER | API_FETCH | HTML_PARSE | BROWSER_FALLBACK
    company_name: text('company_name').notNull(),
    source_url: text('source_url').notNull(),

    // Performance
    success_count: integer('success_count').notNull().default(0),
    failure_count: integer('failure_count').notNull().default(0),
    avg_duration_ms: real('avg_duration_ms').notNull().default(0),
    max_duration_ms: integer('max_duration_ms'),

    // Browser fallback tracking
    browser_fallback_used: boolean('browser_fallback_used').notNull().default(false),
    browser_fallback_count: integer('browser_fallback_count').notNull().default(0),
    browser_fallback_rate: real('browser_fallback_rate').notNull().default(0), // 0.0 - 1.0

    // Result
    jobs_fetched: integer('jobs_fetched').notNull().default(0),
    status: text('status').notNull(), // success | partial_failure | failure

    // Error tracking
    last_error: text('last_error'),
    error_count: integer('error_count').notNull().default(0),

    // Audit
    created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    runIdIdx: index('adapter_metrics_run_id_idx').on(table.run_id),
    adapterTypeIdx: index('adapter_metrics_adapter_type_idx').on(table.adapter_type),
    companyNameIdx: index('adapter_metrics_company_name_idx').on(table.company_name),
  })
);