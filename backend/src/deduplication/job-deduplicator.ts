import { createHash } from 'crypto';
import { NormalizedJob } from '../normalization/normalized-job';
import { UniqueJob, DeduplicationResult } from './unique-job';
import { db } from '../db';
import { companies } from '../db/schema';
import { eq } from 'drizzle-orm';

interface JobRecord {
  identity_hash: string;
  first_seen_at: Date;
  last_seen_at: Date;
  is_active: boolean;
}

/**
 * JobDeduplicator
 * 
 * Enforces job identity across ingestion runs.
 * 
 * Rules:
 * 1. Same company + normalized title + location + URL = same job
 * 2. URL changes → track history but maintain identity
 * 3. Job disappears then reappears → reactivate, not new
 * 4. Duplicates within batch → keep one, warn about others
 */
export class JobDeduplicator {
  /**
   * Deduplicate a batch of normalized jobs
   * 
   * Flow:
   * 1. Generate identity hash for each job
   * 2. Detect duplicates within batch
   * 3. Look up historical data in DB
   * 4. Mark as NEW/UPDATED/DUPLICATE/REACTIVATED
   * 5. Return unique jobs with temporal metadata
   */
  static async deduplicateBatch(
    normalizedJobs: NormalizedJob[]
  ): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const unique_jobs: UniqueJob[] = [];
    const duplicates: DeduplicationResult['duplicates'] = [];
    const reactivated: UniqueJob[] = [];
    const seenHashes = new Map<string, UniqueJob>(); // Within-batch dedup

    // Step 1: Generate hashes and detect within-batch duplicates
    const jobsWithHashes = normalizedJobs.map((job) => ({
      job,
      hash: this.generateIdentityHash(job),
    }));

    // Step 2: Deduplicate within batch
    for (const { job, hash } of jobsWithHashes) {
      if (seenHashes.has(hash)) {
        // Duplicate within batch
        const canonical = seenHashes.get(hash)!;
        duplicates.push({
          job,
          duplicate_of: hash,
          reason: `Duplicate of ${canonical.title} from same ingestion run`,
        });
      } else {
        // First time seeing this hash in this batch - will be unique (pending DB check)
        seenHashes.set(hash, undefined as any);
      }
    }

    // Step 3: Look up historical records from DB
    // For now, we'll create placeholders - in production this queries a jobs table
    const now = new Date();

    for (const [hash, _] of seenHashes) {
      const matchingJob = jobsWithHashes.find((j) => j.hash === hash)!;
      const job = matchingJob.job;

      // Simulate DB lookup (in production: SELECT * FROM jobs WHERE identity_hash = ?)
      // For MVP, we'll treat all as NEW
      const historicalRecord = await this.lookupHistoricalJob(hash, job.company_id);

      let status: UniqueJob['job_status'];
      let first_seen = now;
      let last_seen = now;
      let is_active = true;

      if (historicalRecord) {
        // Job exists in history
        first_seen = historicalRecord.first_seen_at;
        last_seen = now;

        if (!historicalRecord.is_active) {
          // Was inactive, now active again → REACTIVATED
          status = 'REACTIVATED';
        } else if (hash !== matchingJob.hash) {
          // Hash changed (shouldn't happen in current design) → UPDATED
          status = 'UPDATED';
        } else {
          // Same hash, still active → UPDATED
          status = 'UPDATED';
        }
      } else {
        // New job never seen before → NEW
        status = 'NEW';
      }

      const uniqueJob: UniqueJob = {
        ...job,
        identity_hash: hash,
        job_status: status,
        first_seen_at: first_seen,
        last_seen_at: last_seen,
        is_active,
        dedup_metadata: {
          matched_on: ['title', 'location', 'url'],
          confidence: 1.0,
        },
      };

      unique_jobs.push(uniqueJob);

      if (status === 'REACTIVATED') {
        reactivated.push(uniqueJob);
      }
    }

    // Step 4: Calculate stats
    const newCount = unique_jobs.filter((j) => j.job_status === 'NEW').length;
    const updatedCount = unique_jobs.filter((j) => j.job_status === 'UPDATED').length;

    const result: DeduplicationResult = {
      unique_jobs,
      duplicates,
      reactivated,
      stats: {
        input_count: normalizedJobs.length,
        unique_count: unique_jobs.length,
        duplicate_count: duplicates.length,
        reactivated_count: reactivated.length,
        new_count: newCount,
        updated_count: updatedCount,
        duration_ms: Date.now() - startTime,
      },
    };

    return result;
  }

  /**
   * Generate stable identity hash for a job
   * 
   * Based on:
   * - company_id (exact)
   * - title (normalized: lowercase, trimmed)
   * - location (normalized: lowercase, trimmed)
   * - url (canonical: lowercase, no query params after job id)
   * 
   * Same input = same hash (deterministic)
   */
  private static generateIdentityHash(job: NormalizedJob): string {
    const canonicalUrl = this.canonicalizeUrl(job.url);

    const identityString = [
      job.company_id,
      job.title.toLowerCase().trim(),
      job.location.toLowerCase().trim(),
      canonicalUrl,
    ].join('|');

    // SHA256 hash
    return createHash('sha256').update(identityString).digest('hex').substring(0, 16);
  }

  /**
   * Canonicalize URL for identity matching
   * 
   * Remove tracking params, standardize format
   */
  private static canonicalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove common tracking params
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'ref',
        'fbclid',
        'gclid',
        'msclkid',
      ];

      trackingParams.forEach((param) => {
        urlObj.searchParams.delete(param);
      });

      return urlObj.toString().toLowerCase();
    } catch {
      // If URL parsing fails, just normalize as string
      return url.toLowerCase();
    }
  }

  /**
   * Look up historical job record from database
   * 
   * In production, this would query:
   * SELECT * FROM jobs_history WHERE identity_hash = ? AND company_id = ?
   * 
   * For MVP, returns null (all jobs are new)
   * TODO: Implement once jobs table exists
   */
  private static async lookupHistoricalJob(
    hash: string,
    company_id: number
  ): Promise<JobRecord | null> {
    // Placeholder: no historical data in MVP
    // In production:
    // return db.select().from(jobsHistory)
    //   .where(and(eq(jobsHistory.identity_hash, hash), eq(jobsHistory.company_id, company_id)))
    //   .limit(1)
    //   .then(rows => rows[0] || null)
    return null;
  }
}
