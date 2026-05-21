import express from 'express';
import { HealthService } from './metrics';
import { createJobQueryRouter } from '../queries/job-query-router';

/**
 * HealthEndpoints
 *
 * Exposes read-only health check endpoints
 * - /health: System health status
 * - /metrics: Last ingestion run summary
 *
 * No authentication, no writes
 */
export function createHealthRouter(): express.Router {
  const router = express.Router();

  /**
   * GET /health
   *
   * Returns:
   * - status: healthy | degraded | unhealthy
   * - message: Human-readable status message
   * - metrics: Data quality and adapter health scores
   */
  router.get('/health', async (req, res) => {
    try {
      const health = await HealthService.getHealthStatus();
      const statusCode =
        health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;

      res.status(statusCode).json({
        status: health.status,
        message: health.message,
        timestamp: new Date().toISOString(),
        metrics: health.metrics,
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        message: 'Health check failed: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /metrics
   *
   * Returns:
   * - ingestion_run: Last run summary
   * - adapter_health: Per-adapter performance
   * - data_quality: Classification, location, deduplication rates
   */
  router.get('/metrics', async (req, res) => {
    try {
      const lastRun = await HealthService.getLastRun();
      const adapters = await HealthService.getAdapterHealth();
      const quality = await HealthService.getDataQualitySignals();

      res.json({
        last_run: lastRun ? {
          run_id: lastRun.run_id,
          started_at: lastRun.started_at.toISOString(),
          completed_at: lastRun.completed_at?.toISOString(),
          duration_ms: lastRun.duration_ms,
          status: lastRun.status,
          metrics: {
            sources_processed: lastRun.sources_processed,
            jobs_fetched: lastRun.jobs_fetched,
            jobs_normalized: lastRun.jobs_normalized,
            jobs_deduplicated: lastRun.jobs_deduplicated,
            jobs_persisted: lastRun.jobs_persisted,
            jobs_classified: lastRun.jobs_classified,
          },
        } : null,
        adapter_health: adapters.map((a) => ({
          adapter_type: a.adapter_type,
          company_name: a.company_name,
          success_count: a.success_count,
          failure_count: a.failure_count,
          avg_duration_ms: a.avg_duration_ms.toFixed(2),
          browser_fallback_rate: (a.browser_fallback_rate * 100).toFixed(2) + '%',
          jobs_fetched: a.jobs_fetched,
          status: a.status,
        })),
        data_quality: {
          unknown_classification_rate:
            (quality.unknown_classification_rate * 100).toFixed(2) + '%',
          missing_location_rate: (quality.missing_location_rate * 100).toFixed(2) + '%',
          duplicate_suppression_rate:
            (quality.duplicate_suppression_rate * 100).toFixed(2) + '%',
          reactivation_count: quality.reactivation_rate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch metrics: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /metrics/adapters
   *
   * Detailed per-adapter breakdown
   */
  router.get('/metrics/adapters', async (req, res) => {
    try {
      const adapters = await HealthService.getAdapterHealth();

      res.json({
        adapters: adapters.map((a) => ({
          adapter_type: a.adapter_type,
          company_name: a.company_name,
          source_url: a.source_url,
          success_count: a.success_count,
          failure_count: a.failure_count,
          error_count: a.error_count,
          avg_duration_ms: a.avg_duration_ms.toFixed(2),
          max_duration_ms: a.max_duration_ms,
          browser_fallback_used: a.browser_fallback_used,
          browser_fallback_count: a.browser_fallback_count,
          browser_fallback_rate: (a.browser_fallback_rate * 100).toFixed(2) + '%',
          jobs_fetched: a.jobs_fetched,
          status: a.status,
          last_error: a.last_error,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch adapter metrics: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /metrics/quality
   *
   * Data quality signals only
   */
  router.get('/metrics/quality', async (req, res) => {
    try {
      const quality = await HealthService.getDataQualitySignals();

      res.json({
        quality_signals: {
          unknown_classification_rate: (quality.unknown_classification_rate * 100).toFixed(2) + '%',
          missing_location_rate: (quality.missing_location_rate * 100).toFixed(2) + '%',
          duplicate_suppression_rate: (quality.duplicate_suppression_rate * 100).toFixed(2) + '%',
          reactivation_count: quality.reactivation_rate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch quality metrics: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

/**
 * Start the API server (health + job query endpoints)
 */
export async function startApiServer(port: number = 3001): Promise<void> {
  const app = express();
  const healthRouter = createHealthRouter();
  const jobQueryRouter = createJobQueryRouter();

  // Mount health endpoints at root
  app.use('/', healthRouter);

  // Mount job query endpoints under /api
  app.use('/api', jobQueryRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      available: [
        '/health',
        '/metrics',
        '/metrics/adapters',
        '/metrics/quality',
        '/api/jobs/active-software',
        '/api/jobs/:id',
      ],
    });
  });

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`\n🚀 API server running on http://localhost:${port}`);
      console.log(`   Health:`);
      console.log(`   GET /health - System health`);
      console.log(`   GET /metrics - Run metrics`);
      console.log(`   GET /metrics/adapters - Adapter performance`);
      console.log(`   GET /metrics/quality - Data quality`);
      console.log(`   Jobs:`);
      console.log(`   GET /api/jobs/active-software - Active software jobs`);
      console.log(`   GET /api/jobs/:id - Job details\n`);
      resolve();
    });
  });
}
