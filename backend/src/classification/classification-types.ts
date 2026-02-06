/**
 * Job Category - Software vs Non-Software
 */
export type JobCategory = 'SOFTWARE' | 'NON_SOFTWARE' | 'UNKNOWN';

/**
 * Job Role - Specialization within software/tech
 */
export type JobRole = 'frontend' | 'backend' | 'data' | 'devops' | 'qa' | 'fullstack' | 'other' | 'unknown';

/**
 * Classification Result for a single job
 */
export interface JobClassification {
  identity_hash: string;
  category: JobCategory;
  role: JobRole;
  confidence: number; // 0.0 - 1.0
}

/**
 * Result of batch classification operation
 */
export interface ClassificationResult {
  /** Successfully classified jobs */
  classified: JobClassification[];

  /** Jobs that failed classification */
  failed: Array<{
    identity_hash: string;
    error: string;
  }>;

  /** Summary statistics */
  stats: {
    total_input: number;
    total_classified: number;
    total_failed: number;
    software_count: number;
    non_software_count: number;
    unknown_count: number;
    duration_ms: number;
  };
}

/**
 * Job record with title for classification
 */
export interface JobForClassification {
  identity_hash: string;
  title: string;
  location?: string;
}
