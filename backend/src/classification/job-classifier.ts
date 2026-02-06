import { db } from '../db';
import { jobs, jobClassifications } from '../db/schema';
import { eq } from 'drizzle-orm';
import {
  ClassificationResult,
  JobForClassification,
} from './classification-types';
import { RuleBasedClassifier } from './rule-based-classifier';

/**
 * JobClassifier
 *
 * Reads active jobs, classifies them, and persists results.
 * - Idempotent (can re-run safely)
 * - Versionable (tracks classifier version)
 * - Isolated from ingestion/persistence logic
 */
export class JobClassifier {
  /**
   * Classify active jobs and persist results
   *
   * Flow:
   * 1. Get all active jobs
   * 2. Run classifier
   * 3. Upsert classification results
   * 4. Return stats
   */
  static async classifyAndPersist(): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Step 1: Get all active jobs
    const activeJobs = await db
      .select({
        identity_hash: jobs.identity_hash,
        title: jobs.title,
        location: jobs.location,
      })
      .from(jobs)
      .where(eq(jobs.is_active, true));

    const jobsForClassification: JobForClassification[] = activeJobs.map((j) => ({
      identity_hash: j.identity_hash,
      title: j.title,
      location: j.location,
    }));

    // Step 2: Classify using rule-based classifier
    const classificationResult =
      RuleBasedClassifier.classifyBatch(jobsForClassification);

    // Step 3: Persist classifications (upsert)
    const now = new Date();
    const updates = [];
    const inserts = [];

    // First pass: find what exists
    for (const classification of classificationResult.classified) {
      try {
        const existing = await db
          .select()
          .from(jobClassifications)
          .where(eq(jobClassifications.identity_hash, classification.identity_hash));

        if (existing && existing.length > 0) {
          updates.push(classification);
        } else {
          inserts.push(classification);
        }
      } catch (error) {
        classificationResult.failed.push({
          identity_hash: classification.identity_hash,
          error: `Check error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    // Second pass: update existing
    for (const classification of updates) {
      try {
        await db
          .update(jobClassifications)
          .set({
            category: classification.category,
            role: classification.role,
            confidence: classification.confidence,
            classifier_version: '1.0-rule-based',
            classified_at: now,
            updated_at: now,
          })
          .where(eq(jobClassifications.identity_hash, classification.identity_hash));
      } catch (error) {
        classificationResult.failed.push({
          identity_hash: classification.identity_hash,
          error: `Update error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    // Third pass: insert new
    for (const classification of inserts) {
      try {
        await db.insert(jobClassifications).values({
          identity_hash: classification.identity_hash,
          category: classification.category,
          role: classification.role,
          confidence: classification.confidence,
          classifier_version: '1.0-rule-based',
          classified_at: now,
          updated_at: now,
        });
      } catch (error) {
        classificationResult.failed.push({
          identity_hash: classification.identity_hash,
          error: `Insert error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }

    // Update stats with actual duration
    classificationResult.stats.duration_ms = Date.now() - startTime;

    return classificationResult;
  }

  /**
   * Count classifications by category
   */
  static async countByCategory(): Promise<{
    SOFTWARE: number;
    NON_SOFTWARE: number;
    UNKNOWN: number;
  }> {
    const allClassifications = await db.select().from(jobClassifications);

    const breakdown = {
      SOFTWARE: 0,
      NON_SOFTWARE: 0,
      UNKNOWN: 0,
    };

    for (const c of allClassifications) {
      if (c.category === 'SOFTWARE') {
        breakdown.SOFTWARE++;
      } else if (c.category === 'NON_SOFTWARE') {
        breakdown.NON_SOFTWARE++;
      } else {
        breakdown.UNKNOWN++;
      }
    }

    return breakdown;
  }
}

