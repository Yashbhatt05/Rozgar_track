import apiClient from './client';
import type { Job, ActiveSoftwareJobsResponse, JobFilters } from '../types/job';

export const jobApi = {
  getActiveSoftwareJobs: async (params: {
    page?: number;
    limit?: number;
    filters?: JobFilters;
  }): Promise<ActiveSoftwareJobsResponse> => {
    const { page = 1, limit = 20, filters } = params;
    const res = await apiClient.get<ActiveSoftwareJobsResponse>(
      '/jobs/active-software',
      {
        params: {
          page,
          limit,
          ...(filters?.role?.length && { role: filters.role.join(',') }),
          ...(filters?.location?.length && {
            location: filters.location.join(','),
          }),
          ...(filters?.sortBy && { sort: filters.sortBy }),
          ...(filters?.searchTerm && { search: filters.searchTerm }),
        },
      }
    );
    return res.data;
  },

  getJobById: async (id: string): Promise<Job> => {
    const res = await apiClient.get<Job>(`/jobs/${id}`);
    return res.data;
  },
};