import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobApi } from '../api/jobs';
import { useQuery } from '@tanstack/react-query';
import type { Job } from '../types/job';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';

const HOURS_24_MS = 24 * 60 * 60 * 1000;

const computeIsNew = (job: Job): boolean => {
  if (job.isNew !== undefined) return job.isNew;
  return Date.now() - new Date(job.firstSeenAt).getTime() < HOURS_24_MS;
};

const computeIsReactivated = (job: Job): boolean => {
  if (job.isReactivated !== undefined) return job.isReactivated;
  if (computeIsNew(job)) return false;
  return Date.now() - new Date(job.lastSeenAt).getTime() < HOURS_24_MS;
};

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const {
    data: job,
    isLoading,
    isError,
  } = useQuery<Job, Error>({
    queryKey: ['job', id],
    queryFn: () => jobApi.getJobById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton height={40} width="60%" />
        <LoadingSkeleton height={20} width="30%" />
        <div className="grid grid-cols-2 gap-6 mt-8">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} height={20} width="100%" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState message="Failed to load job details. Please try again later." />
    );
  }

  if (!job) {
    return <EmptyState message="Job not found." />;
  }

  const isNew = computeIsNew(job);
  const isReactivated = computeIsReactivated(job);

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to jobs
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {job.title}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
              {job.company} &mdash; {job.location}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNew && <StatusBadge variant="new">NEW</StatusBadge>}
            {isReactivated && <StatusBadge variant="reactivated">REACTIVATED</StatusBadge>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Role
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {job.role}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Confidence Score
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(job.confidenceScore * 100)}%
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Source Type
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {job.sourceType}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Ingestion Strategy
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {job.ingestionStrategy}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              First Seen
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(job.firstSeenAt), { addSuffix: true })}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Last Seen
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(job.lastSeenAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a
            href={job.externalApplyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Externally
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;