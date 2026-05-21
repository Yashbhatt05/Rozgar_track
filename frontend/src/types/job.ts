export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  role: string;
  confidenceScore: number;
  firstSeenAt: string; // ISO date string
  lastSeenAt: string; // ISO date string
  sourceType: string;
  ingestionStrategy: string;
  externalApplyLink: string;
  isNew?: boolean;
  isReactivated?: boolean;
}

export interface ActiveSoftwareJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

export interface JobFilters {
  role?: string[];
  location?: string[];
  company?: string[];
  sourceType?: string[];
  sortBy?: 'newest' | 'recentlyUpdated' | 'confidence';
  searchTerm?: string;
}