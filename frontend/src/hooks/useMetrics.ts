import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '../api/metrics';
import type {
  MetricsResponse,
  AdapterMetricsResponse,
  QualityMetricsResponse,
} from '../types/metrics';

export const useMetrics = () => {
  return useQuery<MetricsResponse, Error>({
    queryKey: ['metrics'],
    queryFn: metricsApi.getMetrics,
    refetchInterval: 30000,
  });
};

export const useAdapterMetrics = () => {
  return useQuery<AdapterMetricsResponse, Error>({
    queryKey: ['adapterMetrics'],
    queryFn: metricsApi.getAdapterMetrics,
    refetchInterval: 30000,
  });
};

export const useQualityMetrics = () => {
  return useQuery<QualityMetricsResponse, Error>({
    queryKey: ['qualityMetrics'],
    queryFn: metricsApi.getQualityMetrics,
    refetchInterval: 30000,
  });
};