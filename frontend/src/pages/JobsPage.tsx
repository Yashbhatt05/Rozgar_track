import React, { useState } from 'react';
import { useActiveSoftwareJobsSimple } from '../hooks/useActiveSoftwareJobs';
import JobCard from '../components/ui/JobCard';
import SearchBar from '../components/ui/SearchBar';
import FilterSidebar from '../components/ui/FilterSidebar';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';
import PaginationControls from '../components/ui/PaginationControls';

const JobsPage: React.FC = () => {
  // We'll manage filters locally for this example
  const [filters, setFilters] = useState({
    role: [],
    location: [],
    company: [],
    sourceType: [],
    sortBy: 'newest' as const,
    searchTerm: '',
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const {
    data,
    isLoading,
    isError,
  } = useActiveSoftwareJobsSimple(filters, { 
    page: currentPage, 
    limit: pageSize 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Show skeleton loaders for job cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <LoadingSkeleton key={i} height={120} width="100%" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <EmptyState message="Failed to load jobs. Please try again later." />;
  }

  const jobs = data?.jobs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  if (jobs.length === 0 && total === 0) {
    return <EmptyState message="No jobs found matching your criteria." />;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Filter Sidebar */}
      <div className="col-span-3 lg:col-span-2">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Jobs List */}
      <div className="col-span-9 lg:col-span-10">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Active Software Jobs
            </h1>
            <div className="flex items-center space-x-3">
              <SearchBar
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              />
              <button
                onClick={() => setPageSize(prev => prev === 20 ? 50 : 20)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Show {pageSize === 20 ? '50' : '20'}
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="mt-4"
            />
          )}
          
          {/* Summary */}
          {! (totalPages > 1) && (
            <p className="mt-4 text-center text-gray-500">
              Showing {jobs.length} of {total} jobs
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsPage;