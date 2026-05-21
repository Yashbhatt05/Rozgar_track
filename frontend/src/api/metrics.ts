import apiClient from './client';
import type {
  MetricsResponse,
  AdapterMetricsResponse,
  QualityMetricsResponse,
} from '../types/metrics';

export const metricsApi = {
  getMetrics: async (): Promise<MetricsResponse> => {
    const res = await apiClient.get<MetricsResponse>('/metrics');
    return res.data;
  },

  getAdapterMetrics: async (): Promise<AdapterMetricsResponse> => {
    const res = await apiClient.get<AdapterMetricsResponse>('/metrics/adapters');
    return res.data;
  },

  getQualityMetrics: async (): Promise<QualityMetricsResponse> => {
    const res = await apiClient.get<QualityMetricsResponse>('/metrics/quality');
    return res.data;
  },
};