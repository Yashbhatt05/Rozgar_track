import { db } from '../db';
import { jobs, jobClassifications, companies } from '../db/schema';
import { eq, and, inArray, like, gte } from 'drizzle-orm';
import {
  QueryJob,
  QueryJobStats,
  QueryFilter,
  QueryResult,
  SourceType,
  JobCategory,
  JobRole,
} from './query-types';

/**
 * JobQueryService
 *
 * Read-only query layer for accessing job data
 * - Safe, immutable results
 * - Pre-defined query patterns
 * - No writes, no ingestion logic
 * - Suitable for exposing to frontend/API consumers
 */
export class JobQueryService {
  /**
   * Get all active software jobs
   * - Only jobs classified as SOFTWARE
   * - is_active = true
   */
  static async getActiveSoftwareJobs(
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    // Build filter conditions
    const conditions = [eq(jobs.is_active, true)];

    // Add optional filters
    if (filter?.source_types && filter.source_types.length > 0) {
      conditions.push(inArray(jobs.source_type as any, filter.source_types));
    }

    if (filter?.location_search) {
      conditions.push(like(jobs.location, `%${filter.location_search}%`));
    }

    if (filter?.title_search) {
      conditions.push(like(jobs.title, `%${filter.title_search}%`));
    }

    // Fetch jobs
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions));

    // Get classification for each and filter to SOFTWARE
    const results: QueryJob[] = [];
    for (const job of jobsData) {
      const classification = await db
        .select()
        .from(jobClassifications)
        .where(eq(jobClassifications.identity_hash, job.identity_hash))
        .then((rows) => rows[0] || null);

      if (classification && classification.category === 'SOFTWARE') {
        results.push({
          identity_hash: job.identity_hash,
          company_id: job.company_id,
          company_name: job.company_name,
          source_type: job.source_type as SourceType,
          ingestion_strategy: job.ingestion_strategy,
          title: job.title,
          location: job.location,
          url: job.url,
          first_seen_at: new Date(job.first_seen_at),
          last_seen_at: new Date(job.last_seen_at),
          is_active: job.is_active,
          classification: {
            category: classification.category as JobCategory,
            role: classification.role as JobRole,
            confidence: classification.confidence,
            classified_at: new Date(classification.classified_at),
          },
          metadata: job.metadata as Record<string, any>,
        });
      }
    }

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Get jobs by specific role
   */
  static async getJobsByRole(
    role: JobRole,
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    // Get classifications for this role
    const classifications = await db
      .select()
      .from(jobClassifications)
      .where(eq(jobClassifications.role, role));

    const hashes = classifications.map((c) => c.identity_hash);
    if (hashes.length === 0) {
      return { data: [], count: 0, total: 0, duration_ms: Date.now() - startTime };
    }

    // Build conditions
    const conditions = [inArray(jobs.identity_hash, hashes)];
    if (filter?.active_only !== false) {
      conditions.push(eq(jobs.is_active, true));
    }

    // Fetch jobs
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions));

    // Map to QueryJob with classification
    const results: QueryJob[] = jobsData.map((job) => {
      const classification = classifications.find(
        (c) => c.identity_hash === job.identity_hash
      );
      return {
        identity_hash: job.identity_hash,
        company_id: job.company_id,
        company_name: job.company_name,
        source_type: job.source_type as SourceType,
        ingestion_strategy: job.ingestion_strategy,
        title: job.title,
        location: job.location,
        url: job.url,
        first_seen_at: new Date(job.first_seen_at),
        last_seen_at: new Date(job.last_seen_at),
        is_active: job.is_active,
        classification: classification
          ? {
              category: classification.category as JobCategory,
              role: classification.role as JobRole,
              confidence: classification.confidence,
              classified_at: new Date(classification.classified_at),
            }
          : undefined,
        metadata: job.metadata as Record<string, any>,
      };
    });

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Get newly posted jobs (within last N hours)
   */
  static async getNewJobs(
    hoursAgo: number = 24,
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    const sinceTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Build conditions
    const conditions = [gte(jobs.first_seen_at, sinceTime)];

    if (filter?.source_types && filter.source_types.length > 0) {
      conditions.push(inArray(jobs.source_type as any, filter.source_types));
    }

    // Fetch jobs
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions));

    // Map with classification
    const results: QueryJob[] = [];
    for (const job of jobsData) {
      const classification = await db
        .select()
        .from(jobClassifications)
        .where(eq(jobClassifications.identity_hash, job.identity_hash))
        .then((rows) => rows[0] || null);

      results.push({
        identity_hash: job.identity_hash,
        company_id: job.company_id,
        company_name: job.company_name,
        source_type: job.source_type as SourceType,
        ingestion_strategy: job.ingestion_strategy,
        title: job.title,
        location: job.location,
        url: job.url,
        first_seen_at: new Date(job.first_seen_at),
        last_seen_at: new Date(job.last_seen_at),
        is_active: job.is_active,
        classification: classification
          ? {
              category: classification.category as JobCategory,
              role: classification.role as JobRole,
              confidence: classification.confidence,
              classified_at: new Date(classification.classified_at),
            }
          : undefined,
        metadata: job.metadata as Record<string, any>,
      });
    }

    // Sort by first_seen_at (newest first)
    results.sort(
      (a, b) => b.first_seen_at.getTime() - a.first_seen_at.getTime()
    );

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Get recently updated jobs (within last N hours)
   */
  static async getUpdatedJobs(
    hoursAgo: number = 24,
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    const sinceTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    // Build conditions - get jobs updated in the last N hours
    const conditions = [gte(jobs.last_seen_at, sinceTime)];

    // Fetch jobs
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions));

    // Map with classification
    const results: QueryJob[] = [];
    for (const job of jobsData) {
      const classification = await db
        .select()
        .from(jobClassifications)
        .where(eq(jobClassifications.identity_hash, job.identity_hash))
        .then((rows) => rows[0] || null);

      results.push({
        identity_hash: job.identity_hash,
        company_id: job.company_id,
        company_name: job.company_name,
        source_type: job.source_type as SourceType,
        ingestion_strategy: job.ingestion_strategy,
        title: job.title,
        location: job.location,
        url: job.url,
        first_seen_at: new Date(job.first_seen_at),
        last_seen_at: new Date(job.last_seen_at),
        is_active: job.is_active,
        classification: classification
          ? {
              category: classification.category as JobCategory,
              role: classification.role as JobRole,
              confidence: classification.confidence,
              classified_at: new Date(classification.classified_at),
            }
          : undefined,
        metadata: job.metadata as Record<string, any>,
      });
    }

    // Sort by last_seen_at (most recent first)
    results.sort(
      (a, b) => b.last_seen_at.getTime() - a.last_seen_at.getTime()
    );

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Get jobs by company
   */
  static async getJobsByCompany(
    companyNameOrId: string | number,
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    // Build conditions
    const companyCondition =
      typeof companyNameOrId === 'number'
        ? eq(jobs.company_id, companyNameOrId)
        : eq(jobs.company_name, companyNameOrId);

    const conditions = [companyCondition];

    if (filter?.active_only !== false) {
      conditions.push(eq(jobs.is_active, true));
    }

    // Fetch jobs
    const jobsData = await db
      .select()
      .from(jobs)
      .where(and(...conditions));

    // Map with classification
    const results: QueryJob[] = [];
    for (const job of jobsData) {
      const classification = await db
        .select()
        .from(jobClassifications)
        .where(eq(jobClassifications.identity_hash, job.identity_hash))
        .then((rows) => rows[0] || null);

      results.push({
        identity_hash: job.identity_hash,
        company_id: job.company_id,
        company_name: job.company_name,
        source_type: job.source_type as SourceType,
        ingestion_strategy: job.ingestion_strategy,
        title: job.title,
        location: job.location,
        url: job.url,
        first_seen_at: new Date(job.first_seen_at),
        last_seen_at: new Date(job.last_seen_at),
        is_active: job.is_active,
        classification: classification
          ? {
              category: classification.category as JobCategory,
              role: classification.role as JobRole,
              confidence: classification.confidence,
              classified_at: new Date(classification.classified_at),
            }
          : undefined,
        metadata: job.metadata as Record<string, any>,
      });
    }

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Get aggregate statistics
   */
  static async getStatistics(): Promise<QueryJobStats> {
    const allJobs = await db.select().from(jobs);
    const allClassifications = await db
      .select()
      .from(jobClassifications);

    // Calculate stats
    const now = Date.now();
    const day24hAgo = new Date(now - 24 * 60 * 60 * 1000);

    const stats: QueryJobStats = {
      total_jobs: allJobs.length,
      active_jobs: allJobs.filter((j) => j.is_active).length,
      inactive_jobs: allJobs.filter((j) => !j.is_active).length,
      new_jobs_24h: allJobs.filter(
        (j) => new Date(j.first_seen_at) > day24hAgo
      ).length,
      updated_jobs_24h: allJobs.filter(
        (j) => new Date(j.last_seen_at) > day24hAgo
      ).length,
      reactivated_jobs: allJobs.filter((j) => {
        const lastUpdate = new Date(j.updated_at);
        return j.is_active && lastUpdate > day24hAgo;
      }).length,
      software_count: allClassifications.filter(
        (c) => c.category === 'SOFTWARE'
      ).length,
      non_software_count: allClassifications.filter(
        (c) => c.category === 'NON_SOFTWARE'
      ).length,
      unknown_count: allClassifications.filter(
        (c) => c.category === 'UNKNOWN'
      ).length,
      by_source: {
        PLATFORM: allJobs.filter((j) => j.source_type === 'PLATFORM').length,
        API: allJobs.filter((j) => j.source_type === 'API').length,
        STATIC: allJobs.filter((j) => j.source_type === 'STATIC').length,
        DYNAMIC: allJobs.filter((j) => j.source_type === 'DYNAMIC').length,
        UNKNOWN: allJobs.filter((j) => j.source_type === 'UNKNOWN').length,
      },
      by_role: {
        frontend: allClassifications.filter((c) => c.role === 'frontend').length,
        backend: allClassifications.filter((c) => c.role === 'backend').length,
        fullstack: allClassifications.filter((c) => c.role === 'fullstack').length,
        data: allClassifications.filter((c) => c.role === 'data').length,
        devops: allClassifications.filter((c) => c.role === 'devops').length,
        qa: allClassifications.filter((c) => c.role === 'qa').length,
        other: allClassifications.filter((c) => c.role === 'other').length,
        unknown: allClassifications.filter((c) => c.role === 'unknown').length,
      },
    };

    return stats;
  }

  /**
   * Search jobs by title or location
   */
  static async searchJobs(
    query: string,
    filter?: Partial<QueryFilter>
  ): Promise<QueryResult<QueryJob>> {
    const startTime = Date.now();

    // Fetch all jobs and filter in memory for case-insensitive search
    const allJobs = await db.select().from(jobs);
    const queryLower = query.toLowerCase();

    // Filter jobs matching the search query
    const matchedJobs = allJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(queryLower) ||
        job.location.toLowerCase().includes(queryLower)
    );

    if (filter?.active_only !== false) {
      matchedJobs.filter((j) => j.is_active);
    }

    // Map with classification
    const results: QueryJob[] = [];
    for (const job of matchedJobs) {
      const classification = await db
        .select()
        .from(jobClassifications)
        .where(eq(jobClassifications.identity_hash, job.identity_hash))
        .then((rows) => rows[0] || null);

      results.push({
        identity_hash: job.identity_hash,
        company_id: job.company_id,
        company_name: job.company_name,
        source_type: job.source_type as SourceType,
        ingestion_strategy: job.ingestion_strategy,
        title: job.title,
        location: job.location,
        url: job.url,
        first_seen_at: new Date(job.first_seen_at),
        last_seen_at: new Date(job.last_seen_at),
        is_active: job.is_active,
        classification: classification
          ? {
              category: classification.category as JobCategory,
              role: classification.role as JobRole,
              confidence: classification.confidence,
              classified_at: new Date(classification.classified_at),
            }
          : undefined,
        metadata: job.metadata as Record<string, any>,
      });
    }

    // Apply pagination
    let paginatedResults = results;
    if (filter?.offset) {
      paginatedResults = paginatedResults.slice(filter.offset);
    }
    if (filter?.limit) {
      paginatedResults = paginatedResults.slice(0, filter.limit);
    }

    return {
      data: paginatedResults,
      count: paginatedResults.length,
      total: results.length,
      duration_ms: Date.now() - startTime,
    };
  }
}
