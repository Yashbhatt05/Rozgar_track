export interface MetricsResponse {
  last_run: {
    run_id: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number;
    status: string;
    metrics: {
      sources_processed: number;
      jobs_fetched: number;
      jobs_normalized: number;
      jobs_deduplicated: number;
      jobs_persisted: number;
      jobs_classified: number;
    };
  } | null;
  adapter_health: AdapterHealthEntry[];
  data_quality: DataQualitySignals;
  timestamp: string;
}

export interface AdapterHealthEntry {
  adapter_type: string;
  company_name: string;
  success_count: number;
  failure_count: number;
  avg_duration_ms: string;
  browser_fallback_rate: string;
  jobs_fetched: number;
  status: string;
}

export interface AdapterMetricsResponse {
  adapters: AdapterHealthEntry[];
  timestamp: string;
}

export interface DataQualitySignals {
  unknown_classification_rate: string;
  missing_location_rate: string;
  duplicate_suppression_rate: string;
  reactivation_count: number;
}

export interface QualityMetricsResponse {
  quality_signals: DataQualitySignals;
  timestamp: string;
}