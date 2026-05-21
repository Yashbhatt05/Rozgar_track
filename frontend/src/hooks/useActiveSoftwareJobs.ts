import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { jobApi } from '../api/jobs';
import type { ActiveSoftwareJobsResponse } from '../types/job';

/**
 * Hook for paginated active software jobs
 */
export const useActiveSoftwareJobs = (
  filters: any = {},
  options: { pageSize?: number } = {}
) => {
  const { pageSize = 20 } = options;

  return useInfiniteQuery<ActiveSoftwareJobsResponse, Error>({
    queryKey: ['activeSoftwareJobs', filters],
    queryFn: ({ pageParam = 1 }) =>
      jobApi.getActiveSoftwareJobs({
        page: typeof pageParam === 'number' ? pageParam : 1,
        limit: pageSize,
        filters,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      if (lastPage.jobs.length < pageSize || nextPage * pageSize > lastPage.total) {
        return undefined;
      }
      return nextPage;
    },
    initialPageParam: 1,
  });
};

/**
 * Hook for simple (non-paginated) active software jobs
 * Useful for small datasets or when you don't need infinite scroll
 */
export const useActiveSoftwareJobsSimple = (
  filters: any = {},
  options: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 20 } = options;

  return useQuery<ActiveSoftwareJobsResponse, Error>({
    queryKey: ['activeSoftwareJobs', filters, page, limit],
    queryFn: () =>
      jobApi.getActiveSoftwareJobs({
        page,
        limit,
        filters,
      }),
  });
};