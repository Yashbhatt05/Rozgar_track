import React from 'react';
import { useMetrics } from '../hooks/useMetrics';
import MetricCard from '../components/ui/MetricCard';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';

const MetricsPage: React.FC = () => {
  const { data: metrics, isLoading, isError } = useMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} height={120} width="100%" />
          ))}
        </div>
        <LoadingSkeleton height={300} width="100%" />
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load metrics. Ensure the backend pipeline has run at least once.</p>
      </div>
    );
  }

  const { last_run, adapter_health, data_quality } = metrics;

  // Compute derived metrics
  const totalJobs = last_run?.metrics.jobs_fetched ?? 0;
  const totalPersisted = last_run?.metrics.jobs_persisted ?? 0;
  const durationMs = last_run?.duration_ms ?? 0;
  const throughput = durationMs > 0 ? ((totalJobs / durationMs) * 60000).toFixed(1) : '0'; // jobs per minute

  const failureCount = adapter_health.reduce((sum, a) => sum + a.failure_count, 0);
  const successCount = adapter_health.reduce((sum, a) => sum + a.success_count, 0);
  const totalOps = failureCount + successCount;
  const failureRate = totalOps > 0 ? ((failureCount / totalOps) * 100).toFixed(1) : '0';

  const unknownRate = parseFloat(data_quality.unknown_classification_rate) || 0;
  const missingLocationRate = parseFloat(data_quality.missing_location_rate) || 0;
  const duplicateRate = parseFloat(data_quality.duplicate_suppression_rate) || 0;

  return (
    <div className="space-y-8">
      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Ingestion Throughput"
          value={`${throughput} jobs/min`}
          trend={totalJobs > 0 ? 5 : 0}
          tooltip="Jobs fetched per minute in the last run"
        />
        <MetricCard
          title="Failure Rate"
          value={`${failureRate}%`}
          trend={-failureRate}
          isNegative={parseFloat(failureRate) > 5}
          tooltip="Percentage of failed adapter operations"
        />
        <MetricCard
          title="Unknown Classification"
          value={`${unknownRate.toFixed(1)}%`}
          trend={-unknownRate}
          isNegative={unknownRate > 20}
          tooltip="Percentage of jobs with unknown classification"
        />
        <MetricCard
          title="Total Jobs"
          value={totalJobs.toLocaleString()}
          trend={totalPersisted > 0 ? 10 : 0}
          tooltip="Total jobs fetched in the last run"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adapter Health */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Adapter Health
          </h2>
          <div className="space-y-4">
            {adapter_health.length === 0 ? (
              <p className="text-sm text-gray-500">No adapter data available.</p>
            ) : (
              adapter_health.map((adapter) => (
                <div key={adapter.adapter_type + adapter.company_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      adapter.status === 'success' ? 'bg-green-500' :
                      adapter.status === 'partial_failure' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {adapter.company_name}
                      </p>
                      <p className="text-xs text-gray-500">{adapter.adapter_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{adapter.jobs_fetched} jobs</p>
                    <p className="text-xs text-gray-500">
                      {adapter.success_count}/{adapter.success_count + adapter.failure_count} ok
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Data Quality */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Data Quality
          </h2>
          <div className="space-y-6">
            {/* Unknown Classification */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Unknown Classification</span>
                <span className="font-medium">{unknownRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${unknownRate > 20 ? 'bg-red-500' : unknownRate > 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(unknownRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Missing Location */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Missing Location</span>
                <span className="font-medium">{missingLocationRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${missingLocationRate > 20 ? 'bg-red-500' : missingLocationRate > 10 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(missingLocationRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Duplicate Suppression */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Duplicate Suppression</span>
                <span className="font-medium">{duplicateRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(duplicateRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Reactivations */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Reactivations</span>
                <span className="font-medium">{data_quality.reactivation_count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Run Summary */}
      {last_run && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Last Ingestion Run
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Run ID</p>
              <p className="font-medium truncate" title={last_run.run_id}>{last_run.run_id}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className={`font-medium capitalize ${
                last_run.status === 'completed' ? 'text-green-600' :
                last_run.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {last_run.status}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Duration</p>
              <p className="font-medium">{(last_run.duration_ms / 1000).toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-gray-500">Sources</p>
              <p className="font-medium">{last_run.metrics.sources_processed}</p>
            </div>
            <div>
              <p className="text-gray-500">Persisted</p>
              <p className="font-medium">{last_run.metrics.jobs_persisted}</p>
            </div>
            <div>
              <p className="text-gray-500">Classified</p>
              <p className="font-medium">{last_run.metrics.jobs_classified}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPage;