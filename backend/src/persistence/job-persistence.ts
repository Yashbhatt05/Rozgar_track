import { db } from '../db';
import { jobs } from '../db/schema';
import { UniqueJob } from '../deduplication/unique-job';
import { PersistenceResult } from './persistence-result';
import { eq, and, or, inArray } from 'drizzle-orm';

/**
 * JobPersistence
 * 
 * Single source of truth for job lifecycle.
 * 
 * Rules:
 * - Upsert by identity_hash
 * - Never delete jobs
 * - Never overwrite first_seen_at
 * - Idempotent & stateless
 * - One failure doesn't stop batch
 */
export class JobPersistence {
  /**
   * Persist a batch of unique jobs
   * 
   * Flow:
   * 1. For each job, determine if INSERT or UPDATE
   * 2. Rule A: NEW jobs → INSERT with first_seen_at = now
   * 3. Rule B: EXISTING jobs → UPDATE mutable fields, last_seen_at = now
   * 4. Rule C: REACTIVATED → UPDATE is_active = true, preserve first_seen_at
   * 5. Rule D: DEACTIVATION → After batch, mark unseen jobs as is_active = false
   * 6. Collect stats and return
   */
  static async persistJobs(
    uniqueJobs: UniqueJob[]
  ): Promise<PersistenceResult> {
    const startTime = Date.now();
    const failed: PersistenceResult['failed'] = [];

    let inserted_count = 0;
    let updated_count = 0;
    let reactivated_count = 0;
    let deactivated_count = 0;

    const now = new Date();
    const processedHashes = new Set<string>();

    // Step 1: Process each job independently
    for (const job of uniqueJobs) {
      try {
        processedHashes.add(job.identity_hash);

        // Check if job exists
        const existing = await db
          .select()
          .from(jobs)
          .where(eq(jobs.identity_hash, job.identity_hash))
          .limit(1)
          .then((rows) => rows[0] || null);

        if (!existing) {
          // Rule A: INSERT (NEW)
          await db.insert(jobs).values({
            identity_hash: job.identity_hash,
            company_id: job.company_id,
            company_name: job.company_name,
            title: job.title,
            location: job.location,
            url: job.url,
            source_type: job.source_type,
            ingestion_strategy: job.ingestion_strategy,
            first_seen_at: now,
            last_seen_at: now,
            is_active: true,
            raw_data: job.raw_data || null,
            metadata: job.metadata || null,
            created_at: now,
            updated_at: now,
          });

          inserted_count++;
        } else {
          // Rule B & C: UPDATE (EXISTING or REACTIVATED)
          const wasInactive = !existing.is_active;

          await db
            .update(jobs)
            .set({
              title: job.title,
              location: job.location,
              url: job.url,
              source_type: job.source_type,
              ingestion_strategy: job.ingestion_strategy,
              last_seen_at: now,
              is_active: true,
              raw_data: job.raw_data || null,
              metadata: job.metadata || null,
              updated_at: now,
              // first_seen_at is NEVER overwritten
            })
            .where(eq(jobs.identity_hash, job.identity_hash));

          if (wasInactive) {
            reactivated_count++;
          } else {
            updated_count++;
          }
        }
      } catch (error) {
        failed.push({
          identity_hash: job.identity_hash,
          company_id: job.company_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Step 2: Rule D - DEACTIVATION
    // For each company in this batch, mark jobs not in this batch as inactive
    if (uniqueJobs.length > 0) {
      const companiesInBatch = new Set(uniqueJobs.map((j) => j.company_id));

      for (const company_id of companiesInBatch) {
        try {
          // Find jobs from this company that were not in this batch
          const jobsToDeactivate = await db
            .select()
            .from(jobs)
            .where(
              and(
                eq(jobs.company_id, company_id),
                eq(jobs.is_active, true)
                // Only deactivate jobs NOT in this batch
              )
            );

          // Deactivate jobs not in processedHashes
          const hashesToDeactivate = jobsToDeactivate
            .filter((j) => !processedHashes.has(j.identity_hash))
            .map((j) => j.identity_hash);

          if (hashesToDeactivate.length > 0) {
            const result = await db
              .update(jobs)
              .set({
                is_active: false,
                updated_at: now,
              })
              .where(inArray(jobs.identity_hash, hashesToDeactivate));

            deactivated_count += hashesToDeactivate.length;
          }
        } catch (error) {
          console.warn(
            `Failed to deactivate jobs for company ${company_id}:`,
            error
          );
        }
      }
    }

    const duration_ms = Date.now() - startTime;

    return {
      inserted_count,
      updated_count,
      reactivated_count,
      deactivated_count,
      failed_count: failed.length,
      failed,
      stats: {
        total_input: uniqueJobs.length,
        total_processed: uniqueJobs.length - failed.length,
        total_failed: failed.length,
        duration_ms,
      },
    };
  }

  /**
   * Get all active jobs for a company
   */
  static async getActiveJobsByCompany(company_id: number) {
    return db
      .select()
      .from(jobs)
      .where(and(eq(jobs.company_id, company_id), eq(jobs.is_active, true)));
  }

  /**
   * Get all jobs (active and inactive) for a company
   */
  static async getAllJobsByCompany(company_id: number) {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.company_id, company_id));
  }

  /**
   * Get a specific job by identity_hash
   */
  static async getJobByHash(identity_hash: string) {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.identity_hash, identity_hash))
      .limit(1)
      .then((rows) => rows[0] || null);
  }

  /**
   * Count active jobs
   */
  static async countActiveJobs() {
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.is_active, true));
    return result.length;
  }
}
