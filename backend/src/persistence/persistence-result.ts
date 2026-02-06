import { UniqueJob } from '../deduplication/unique-job';

/**
 * Result of job persistence operation
 */
export interface PersistenceResult {
  /** Jobs inserted as new */
  inserted_count: number;

  /** Jobs updated with new data */
  updated_count: number;

  /** Jobs reactivated (were inactive, now active) */
  reactivated_count: number;

  /** Jobs marked inactive (seen before, not in this batch) */
  deactivated_count: number;

  /** Jobs that failed to persist */
  failed_count: number;

  /** Detailed failure records */
  failed: Array<{
    identity_hash: string;
    company_id: number;
    error: string;
  }>;

  /** Summary statistics */
  stats: {
    total_input: number;
    total_processed: number;
    total_failed: number;
    duration_ms: number;
  };
}
