/**
 * Query Types
 *
 * Type definitions for the read/query layer
 * - All results are immutable and safe for consumption
 * - No write operations in this layer
 */

export type SourceType = 'PLATFORM' | 'API' | 'STATIC' | 'DYNAMIC' | 'UNKNOWN';
export type JobCategory = 'SOFTWARE' | 'NON_SOFTWARE' | 'UNKNOWN';
export type JobRole = 'frontend' | 'backend' | 'fullstack' | 'data' | 'devops' | 'qa' | 'other' | 'unknown';
export type JobStatus = 'NEW' | 'UPDATED' | 'DUPLICATE' | 'REACTIVATED';

/**
 * QueryJob
 * 
 * Immutable read-only job record for consumers
 * - Timestamps are preserved (first_seen_at, last_seen_at)
 * - Classification included if available
 * - No raw_data exposure (only metadata)
 */
export interface QueryJob {
  // Identity
  identity_hash: string;
  id?: string;

  // Company & Source
  company_id: number;
  company_name: string;
  source_type: SourceType;
  ingestion_strategy: string;

  // Job Details
  title: string;
  location: string;
  url: string;

  // Temporal State
  first_seen_at: Date;
  last_seen_at: Date;
  is_active: boolean;

  // Classification (optional - may not exist)
  classification?: {
    category: JobCategory;
    role: JobRole;
    confidence: number;
    classified_at: Date;
  };

  // Metadata (safe subset)
  metadata?: Record<string, any>;
}

/**
 * QueryJobStats
 * 
 * Aggregate statistics for analytics
 */
export interface QueryJobStats {
  total_jobs: number;
  active_jobs: number;
  inactive_jobs: number;
  new_jobs_24h: number;
  updated_jobs_24h: number;
  reactivated_jobs: number;
  software_count: number;
  non_software_count: number;
  unknown_count: number;
  by_source: {
    PLATFORM: number;
    API: number;
    STATIC: number;
    DYNAMIC: number;
    UNKNOWN: number;
  };
  by_role: {
    frontend: number;
    backend: number;
    fullstack: number;
    data: number;
    devops: number;
    qa: number;
    other: number;
    unknown: number;
  };
}

/**
 * QueryFilter
 * 
 * Composable filters for job queries
 * - All filters are optional (AND logic when multiple)
 */
export interface QueryFilter {
  // Activity
  active_only?: boolean;
  created_after?: Date;
  updated_after?: Date;

  // Source
  source_types?: SourceType[];
  companies?: number[] | string[]; // company IDs or names

  // Classification
  categories?: JobCategory[];
  roles?: JobRole[];
  min_confidence?: number;

  // Text search
  title_search?: string;
  location_search?: string;

  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * QueryResult
 * 
 * Consistent return type for all queries
 */
export interface QueryResult<T> {
  data: T[];
  count: number;
  total: number;
  duration_ms: number;
}
