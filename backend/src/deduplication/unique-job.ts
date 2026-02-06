import { NormalizedJob } from '../normalization/normalized-job';

/**
 * UniqueJob - Extended NormalizedJob with deduplication metadata
 * 
 * This is what flows into storage and downstream systems.
 * 
 * Key difference from NormalizedJob:
 * - Has stable identity hash
 * - Tracks temporal state (first_seen, last_seen, is_active)
 * - Marks whether this is new, duplicate, or reactivation
 */

export interface UniqueJob extends NormalizedJob {
  /**
   * Stable identity hash based on:
   * - company_id
   * - normalized title
   * - normalized location
   * - canonical URL
   * 
   * This hash is deterministic - same job = same hash
   */
  identity_hash: string;

  /**
   * Status of this job in our system
   */
  job_status: 'NEW' | 'UPDATED' | 'DUPLICATE' | 'REACTIVATED';

  /**
   * First time we saw this job (from DB if exists, or now if new)
   */
  first_seen_at: Date;

  /**
   * Most recent time we confirmed this job is still active
   */
  last_seen_at: Date;

  /**
   * Is this job currently active on the source?
   */
  is_active: boolean;

  /**
   * If this is a duplicate within the same batch, which one is canonical?
   * Reference to the identity_hash of the winning duplicate
   */
  canonical_hash?: string;

  /**
   * Deduplication metadata
   */
  dedup_metadata?: {
    /** Previous identity hash if URL changed */
    previous_hash?: string;

    /** How many duplicates were merged into this job */
    duplicate_count?: number;

    /** Matching fields that proved identity */
    matched_on?: ('url' | 'title' | 'location' | 'computed_hash')[];

    /** Confidence score for identity match (0-1) */
    confidence?: number;
  };
}

/**
 * Result of deduplication operation
 */
export interface DeduplicationResult {
  /** Jobs that passed through dedup (unique) */
  unique_jobs: UniqueJob[];

  /** Jobs that were identified as duplicates */
  duplicates: Array<{
    job: NormalizedJob;
    duplicate_of: string; // identity_hash of canonical job
    reason: string;
  }>;

  /** Jobs that were reactivated (were inactive, now seen again) */
  reactivated: UniqueJob[];

  /** Summary statistics */
  stats: {
    input_count: number;
    unique_count: number;
    duplicate_count: number;
    reactivated_count: number;
    new_count: number;
    updated_count: number;
    duration_ms: number;
  };
}
