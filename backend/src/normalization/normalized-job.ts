/**
 * NormalizedJob - Single job contract for the entire system
 * 
 * This is the ONLY job shape allowed downstream.
 * All adapters must emit this through the orchestrator.
 * 
 * No raw adapter outputs allowed past the orchestrator boundary.
 */

export interface NormalizedJob {
  /**
   * Unique identifier for this job
   * Format: {sourceType}_{companyId}_{jobId}
   */
  id: string;

  /**
   * Which company posted this job
   */
  company_id: number;
  company_name: string;

  /**
   * Job title / position name
   */
  title: string;

  /**
   * Job location (can be "Remote", city, or "Not specified")
   */
  location: string;

  /**
   * Direct URL to the job posting
   */
  url: string;

  /**
   * How the job was discovered
   * Used to route to correct adapter on re-ingestion
   */
  source_type: 'PLATFORM' | 'API' | 'STATIC' | 'DYNAMIC' | 'UNKNOWN';

  /**
   * How the job was fetched
   * Used for analytics/auditing
   */
  ingestion_strategy: 'PLATFORM_ADAPTER' | 'API_FETCH' | 'HTML_PARSE' | 'BROWSER_FALLBACK' | 'ON_DEMAND';

  /**
   * When this job was first fetched from the source
   */
  fetched_at: Date;

  /**
   * When this job was normalized to standard format
   */
  normalized_at: Date;

  /**
   * Raw data from adapter (for debugging/recovery)
   * Stored but not used by downstream systems
   */
  raw_data?: Record<string, any>;

  /**
   * Normalization metadata
   */
  metadata?: {
    /** Original field names before mapping */
    original_fields?: Record<string, string>;
    
    /** Any normalization issues or warnings */
    warnings?: string[];
    
    /** Adapter that provided this job */
    adapter_name?: string;
  };
}

/**
 * Result of normalization batch operation
 */
export interface NormalizationResult {
  /** Jobs that were successfully normalized */
  normalized: NormalizedJob[];

  /** Jobs that failed normalization */
  failed: Array<{
    raw_job: any;
    error: string;
    adapter_name?: string;
  }>;

  /**
   * Summary stats
   */
  stats: {
    total_input: number;
    successful: number;
    failed: number;
    duration_ms: number;
  };
}
