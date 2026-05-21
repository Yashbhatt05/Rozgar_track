import { Router, Request, Response } from 'express';
import { JobQueryService } from './job-query-service';

/**
 * JobQueryRouter
 *
 * Read-only HTTP endpoints for job queries
 * Mounted under /api prefix on the health server
 */
export function createJobQueryRouter(): Router {
  const router = Router();

  /**
   * GET /api/jobs/active-software
   *
   * Returns paginated active software jobs with optional filtering
   */
  router.get('/jobs/active-software', async (req: Request, res: Response) => {
    try {
      const { page, limit, search, location, role, sourceType, sort } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const offset = (pageNum - 1) * limitNum;

      const filter: any = {
        offset,
        limit: limitNum,
        active_only: true,
      };

      // Optional filters
      if (search) {
        filter.title_search = search as string;
      }
      if (location) {
        filter.location_search = location as string;
      }
      if (role) {
        // role can be a comma-separated string
        const roles = (role as string).split(',').map(r => r.trim());
        filter.roles = roles;
      }
      if (sourceType) {
        const sourceTypes = (sourceType as string).split(',').map(s => s.trim().toUpperCase());
        filter.source_types = sourceTypes;
      }

      const result = await JobQueryService.getActiveSoftwareJobs(filter);

      // Sort if requested
      if (sort === 'newest') {
        result.data.sort((a, b) => b.first_seen_at.getTime() - a.first_seen_at.getTime());
      } else if (sort === 'recentlyUpdated') {
        result.data.sort((a, b) => b.last_seen_at.getTime() - a.last_seen_at.getTime());
      } else if (sort === 'confidence') {
        result.data.sort((a, b) => (b.classification?.confidence ?? 0) - (a.classification?.confidence ?? 0));
      }

      res.json({
        jobs: result.data.map(mapJobResponse),
        total: result.total,
        page: pageNum,
        limit: limitNum,
        duration_ms: result.duration_ms,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch jobs: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/jobs/:id
   *
   * Returns a single job by identity_hash
   */
  router.get('/jobs/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const job = await JobQueryService.getJobByIdentityHash(id);

      if (!job) {
        res.status(404).json({
          error: 'Job not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json(mapJobResponse(job));
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch job: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}

/**
 * Map QueryJob to frontend-friendly response format
 */
function mapJobResponse(job: any) {
  return {
    id: job.identity_hash,
    title: job.title,
    company: job.company_name,
    location: job.location,
    role: job.classification?.role ?? 'unknown',
    confidenceScore: job.classification?.confidence ?? 0,
    firstSeenAt: job.first_seen_at.toISOString(),
    lastSeenAt: job.last_seen_at.toISOString(),
    sourceType: job.source_type,
    ingestionStrategy: job.ingestion_strategy,
    externalApplyLink: job.url,
    isActive: job.is_active,
  };
}