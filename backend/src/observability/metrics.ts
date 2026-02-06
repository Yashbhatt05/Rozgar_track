import { db } from '../db';
import { ingestionRuns, adapterMetrics } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * IngestionRunMetrics
 *
 * Tracks a single ingestion run from start to finish
 */
export interface IngestionRunMetrics {
  run_id: string;
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  sources_processed: number;
  jobs_fetched: number;
  jobs_normalized: number;
  jobs_deduplicated: number;
  jobs_persisted: number;
  jobs_classified: number;
  unknown_classifications: number;
  missing_locations: number;
  duplicate_suppressed: number;
  reactivated_jobs: number;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
}

/**
 * AdapterMetricsRecord
 *
 * Tracks performance of a single adapter in a run
 */
export interface AdapterMetricsRecord {
  run_id: string;
  adapter_type: string;
  company_name: string;
  source_url: string;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
  max_duration_ms?: number;
  browser_fallback_used: boolean;
  browser_fallback_count: number;
  browser_fallback_rate: number;
  jobs_fetched: number;
  status: string;
  last_error?: string;
  error_count: number;
}

/**
 * MetricsCollector
 *
 * Collects and persists metrics about ingestion runs
 * - No writes during ingestion (read-only)
 * - Writes at end of run for audit trail
 * - Enables health checks and quality monitoring
 */
export class MetricsCollector {
  private currentRun: IngestionRunMetrics | null = null;
  private adapterMetrics: Map<string, AdapterMetricsRecord> = new Map();

  /**
   * Start a new ingestion run
   */
  static createRun(runId: string): MetricsCollector {
    const collector = new MetricsCollector();
    collector.currentRun = {
      run_id: runId,
      started_at: new Date(),
      sources_processed: 0,
      jobs_fetched: 0,
      jobs_normalized: 0,
      jobs_deduplicated: 0,
      jobs_persisted: 0,
      jobs_classified: 0,
      unknown_classifications: 0,
      missing_locations: 0,
      duplicate_suppressed: 0,
      reactivated_jobs: 0,
      status: 'pending',
    };
    return collector;
  }

  /**
   * Update ingestion metrics
   */
  updateMetric(key: keyof IngestionRunMetrics, value: number): void {
    if (!this.currentRun) return;
    if (typeof (this.currentRun as any)[key] === 'number') {
      (this.currentRun as any)[key] = value;
    }
  }

  /**
   * Increment a metric
   */
  incrementMetric(
    key: keyof IngestionRunMetrics,
    amount: number = 1
  ): void {
    if (!this.currentRun) return;
    if (typeof (this.currentRun as any)[key] === 'number') {
      (this.currentRun as any)[key] += amount;
    }
  }

  /**
   * Record adapter performance
   */
  recordAdapterMetrics(key: string, metrics: AdapterMetricsRecord): void {
    this.adapterMetrics.set(key, metrics);
  }

  /**
   * Mark run as completed
   */
  markComplete(): void {
    if (!this.currentRun) return;
    this.currentRun.completed_at = new Date();
    this.currentRun.duration_ms =
      this.currentRun.completed_at.getTime() -
      this.currentRun.started_at.getTime();
    this.currentRun.status = 'completed';
  }

  /**
   * Mark run as failed
   */
  markFailed(error: string): void {
    if (!this.currentRun) return;
    this.currentRun.completed_at = new Date();
    this.currentRun.duration_ms =
      this.currentRun.completed_at.getTime() -
      this.currentRun.started_at.getTime();
    this.currentRun.status = 'failed';
    this.currentRun.error_message = error;
  }

  /**
   * Persist metrics to database
   */
  async persistMetrics(): Promise<void> {
    if (!this.currentRun) return;

    try {
      // Insert ingestion run
      await db.insert(ingestionRuns).values({
        run_id: this.currentRun.run_id,
        started_at: this.currentRun.started_at,
        completed_at: this.currentRun.completed_at || null,
        duration_ms: this.currentRun.duration_ms || 0,
        sources_processed: this.currentRun.sources_processed,
        jobs_fetched: this.currentRun.jobs_fetched,
        jobs_normalized: this.currentRun.jobs_normalized,
        jobs_deduplicated: this.currentRun.jobs_deduplicated,
        jobs_persisted: this.currentRun.jobs_persisted,
        jobs_classified: this.currentRun.jobs_classified,
        unknown_classifications: this.currentRun.unknown_classifications,
        missing_locations: this.currentRun.missing_locations,
        duplicate_suppressed: this.currentRun.duplicate_suppressed,
        reactivated_jobs: this.currentRun.reactivated_jobs,
        status: this.currentRun.status,
        error_message: this.currentRun.error_message || null,
        created_at: new Date(),
      });

      // Insert adapter metrics
      for (const metrics of this.adapterMetrics.values()) {
        await db.insert(adapterMetrics).values({
          run_id: metrics.run_id,
          adapter_type: metrics.adapter_type,
          company_name: metrics.company_name,
          source_url: metrics.source_url,
          success_count: metrics.success_count,
          failure_count: metrics.failure_count,
          avg_duration_ms: metrics.avg_duration_ms,
          max_duration_ms: metrics.max_duration_ms || 0,
          browser_fallback_used: metrics.browser_fallback_used,
          browser_fallback_count: metrics.browser_fallback_count,
          browser_fallback_rate: metrics.browser_fallback_rate,
          jobs_fetched: metrics.jobs_fetched,
          status: metrics.status,
          last_error: metrics.last_error || null,
          error_count: metrics.error_count,
          created_at: new Date(),
        });
      }
    } catch (error) {
      console.error('Error persisting metrics:', error);
    }
  }

  /**
   * Get current run metrics
   */
  getRunMetrics(): IngestionRunMetrics | null {
    return this.currentRun;
  }

  /**
   * Get adapter metrics
   */
  getAdapterMetrics(): Map<string, AdapterMetricsRecord> {
    return this.adapterMetrics;
  }
}

/**
 * HealthService
 *
 * Reads metrics and provides health status
 */
export class HealthService {
  /**
   * Get last ingestion run summary
   */
  static async getLastRun(): Promise<IngestionRunMetrics | null> {
    const lastRun = await db
      .select()
      .from(ingestionRuns)
      .orderBy((ir) => ir.started_at)
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!lastRun) return null;

    return {
      run_id: lastRun.run_id,
      started_at: new Date(lastRun.started_at),
      completed_at: lastRun.completed_at ? new Date(lastRun.completed_at) : undefined,
      duration_ms: lastRun.duration_ms || undefined,
      sources_processed: lastRun.sources_processed,
      jobs_fetched: lastRun.jobs_fetched,
      jobs_normalized: lastRun.jobs_normalized,
      jobs_deduplicated: lastRun.jobs_deduplicated,
      jobs_persisted: lastRun.jobs_persisted,
      jobs_classified: lastRun.jobs_classified,
      unknown_classifications: lastRun.unknown_classifications,
      missing_locations: lastRun.missing_locations,
      duplicate_suppressed: lastRun.duplicate_suppressed,
      reactivated_jobs: lastRun.reactivated_jobs,
      status: lastRun.status as 'pending' | 'completed' | 'failed',
      error_message: lastRun.error_message || undefined,
    };
  }

  /**
   * Get last run adapter health
   */
  static async getAdapterHealth(): Promise<AdapterMetricsRecord[]> {
    const lastRun = await db
      .select()
      .from(ingestionRuns)
      .orderBy((ir) => ir.started_at)
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!lastRun) return [];

    const metrics = await db
      .select()
      .from(adapterMetrics)
      .where(eq(adapterMetrics.run_id, lastRun.run_id));

    return metrics.map((m) => ({
      run_id: m.run_id,
      adapter_type: m.adapter_type,
      company_name: m.company_name,
      source_url: m.source_url,
      success_count: m.success_count,
      failure_count: m.failure_count,
      avg_duration_ms: m.avg_duration_ms,
      max_duration_ms: m.max_duration_ms || undefined,
      browser_fallback_used: m.browser_fallback_used,
      browser_fallback_count: m.browser_fallback_count,
      browser_fallback_rate: m.browser_fallback_rate,
      jobs_fetched: m.jobs_fetched,
      status: m.status,
      last_error: m.last_error || undefined,
      error_count: m.error_count,
    }));
  }

  /**
   * System health check
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    metrics: {
      last_run_success: boolean;
      data_quality_score: number;
      adapter_failure_rate: number;
    };
  }> {
    const lastRun = await this.getLastRun();
    const adapters = await this.getAdapterHealth();

    if (!lastRun) {
      return {
        status: 'unhealthy',
        message: 'No ingestion runs found',
        metrics: {
          last_run_success: false,
          data_quality_score: 0,
          adapter_failure_rate: 0,
        },
      };
    }

    // Calculate metrics
    const last_run_success = lastRun.status === 'completed';
    
    // Data quality: inverse of unknown classifications
    const data_quality_score =
      lastRun.jobs_classified > 0
        ? 1 - (lastRun.unknown_classifications / lastRun.jobs_classified)
        : 1;

    // Adapter health
    const total_adapter_attempts = adapters.reduce(
      (sum, a) => sum + a.success_count + a.failure_count,
      0
    );
    const total_adapter_failures = adapters.reduce(
      (sum, a) => sum + a.failure_count,
      0
    );
    const adapter_failure_rate =
      total_adapter_attempts > 0
        ? total_adapter_failures / total_adapter_attempts
        : 0;

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'System is operating normally';

    if (!last_run_success) {
      status = 'unhealthy';
      message = `Last run failed: ${lastRun.error_message || 'Unknown error'}`;
    } else if (data_quality_score < 0.5) {
      status = 'degraded';
      message = `Data quality is degraded (${(data_quality_score * 100).toFixed(1)}%)`;
    } else if (adapter_failure_rate > 0.2) {
      status = 'degraded';
      message = `Adapter failure rate is high (${(adapter_failure_rate * 100).toFixed(1)}%)`;
    }

    return {
      status,
      message,
      metrics: {
        last_run_success,
        data_quality_score,
        adapter_failure_rate,
      },
    };
  }

  /**
   * Get data quality signals
   */
  static async getDataQualitySignals(): Promise<{
    unknown_classification_rate: number;
    missing_location_rate: number;
    duplicate_suppression_rate: number;
    reactivation_rate: number;
  }> {
    const lastRun = await this.getLastRun();

    if (!lastRun) {
      return {
        unknown_classification_rate: 0,
        missing_location_rate: 0,
        duplicate_suppression_rate: 0,
        reactivation_rate: 0,
      };
    }

    return {
      unknown_classification_rate:
        lastRun.jobs_classified > 0
          ? lastRun.unknown_classifications / lastRun.jobs_classified
          : 0,
      missing_location_rate:
        lastRun.jobs_normalized > 0
          ? lastRun.missing_locations / lastRun.jobs_normalized
          : 0,
      duplicate_suppression_rate:
        lastRun.jobs_fetched > 0
          ? lastRun.duplicate_suppressed / lastRun.jobs_fetched
          : 0,
      reactivation_rate: lastRun.reactivated_jobs,
    };
  }
}
