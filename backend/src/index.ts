import 'dotenv/config';
import { db } from './db';
import { companies } from './db/schema';
import { classifyAndUpdateSources } from './sourceClassifier';
import { orchestrator } from './ingestion';
import { JobPersistence } from './persistence';
import { JobClassifier } from './classification';
import { JobQueryService } from './queries';
import { MetricsCollector, startHealthServer } from './observability';
import { eq } from 'drizzle-orm';

async function main() {
  // Initialize metrics collection
  const runId = `run-${Date.now()}`;
  const metrics = MetricsCollector.createRun(runId);

  console.log(`\n🚀 Starting ingestion run: ${runId}\n`);
  // Clear existing companies for fresh test
  try {
    const allCompanies = await db.select().from(companies);
    for (const company of allCompanies) {
      await db.delete(companies).where(eq(companies.id, company.id));
    }
    console.log('✓ Cleared existing companies\n');
  } catch (error) {
    console.error('Error clearing companies:', error);
  }

  // Insert test companies with different source types
  try {
    const testCompanies = [
      {
        company_name: 'Airbnb',
        career_url: 'https://boards.greenhouse.io/airbnb/jobs',
        status: 'active',
      },
      {
        company_name: 'Stripe',
        career_url: 'https://stripe.com/jobs/api/list',
        status: 'active',
      },
      {
        company_name: 'TechCorp',
        career_url: 'https://techcorp.com/careers/positions',
        status: 'active',
      },
      {
        company_name: 'StartupXYZ',
        career_url: 'https://startup.jobs',
        status: 'active',
      },
    ];

    for (const company of testCompanies) {
      await db.insert(companies).values(company);
      console.log(`✓ Inserted ${company.company_name}`);
    }
    console.log('');
  } catch (error) {
    console.error('Error inserting companies:', error);
  }

  // Classify sources and assign ingestion strategies
  console.log('📊 Running SourceClassifier...\n');
  await classifyAndUpdateSources();

  // Fetch jobs using ingestion orchestrator
  console.log('\n🚀 Running Ingestion Orchestrator...\n');
  try {
    const allCompanies = await db.select().from(companies);
    let totalUnique = 0;
    let totalPersisted = 0;

    for (const company of allCompanies) {
      if (!company.ingestion_strategy) continue;

      metrics.incrementMetric('sources_processed');

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Company: ${company.company_name}`);
      console.log(`Source Type: ${company.source_type}`);
      console.log(`Strategy: ${company.ingestion_strategy}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Step 1: Normalize & Deduplicate
      const uniqueJobs = await orchestrator.fetchJobsBySourceType(
        company.career_url,
        company.source_type as any,
        {
          id: company.id!,
          name: company.company_name,
        }
      );

      metrics.updateMetric('jobs_fetched', metrics.getRunMetrics()!.jobs_fetched + uniqueJobs.length);
      metrics.updateMetric('jobs_normalized', metrics.getRunMetrics()!.jobs_normalized + uniqueJobs.length);
      metrics.updateMetric('jobs_deduplicated', metrics.getRunMetrics()!.jobs_deduplicated + uniqueJobs.length);

      console.log(`✓ Got ${uniqueJobs.length} unique jobs\n`);
      totalUnique += uniqueJobs.length;

      // Step 2: Persist to database
      if (uniqueJobs.length > 0) {
        console.log(`💾 Persisting jobs...\n`);
        const persistResult = await JobPersistence.persistJobs(uniqueJobs);

        metrics.updateMetric('jobs_persisted', metrics.getRunMetrics()!.jobs_persisted + persistResult.stats.total_processed);

        console.log(`📊 Persistence stats:`);
        console.log(`   - Inserted: ${persistResult.inserted_count}`);
        console.log(`   - Updated: ${persistResult.updated_count}`);
        console.log(`   - Reactivated: ${persistResult.reactivated_count}`);
        metrics.updateMetric('reactivated_jobs', metrics.getRunMetrics()!.reactivated_jobs + persistResult.reactivated_count);
        console.log(`   - Deactivated: ${persistResult.deactivated_count}`);
        console.log(`   - Failed: ${persistResult.failed_count}`);
        console.log(`   - Duration: ${persistResult.stats.duration_ms}ms\n`);

        totalPersisted += persistResult.stats.total_processed;

        if (persistResult.failed_count > 0) {
          console.warn(`⚠️  ${persistResult.failed_count} jobs failed:`);
          persistResult.failed.forEach((f) => {
            console.warn(`   - ${f.identity_hash}: ${f.error}`);
          });
        }

        // Display samples
        if (uniqueJobs.length > 0) {
          console.log('Sample jobs (PERSISTED):');
          uniqueJobs.slice(0, 2).forEach((job) => {
            console.log(`  • ${job.title}`);
            console.log(`    Status: ${job.job_status}`);
            console.log(`    Location: ${job.location}`);
            console.log(`    Hash: ${job.identity_hash}\n`);
          });
        }
      }
    }

    console.log(`\n✅ Ingestion Complete!`);
    console.log(`   Total unique jobs: ${totalUnique}`);
    console.log(`   Total persisted: ${totalPersisted}`);

    // Step 3: Classify jobs
    console.log(`\n🏷️  Running Job Classifier...\n`);
    const classificationResult = await JobClassifier.classifyAndPersist();

    console.log(`📊 Classification stats:`);
    console.log(`   - Total classified: ${classificationResult.stats.total_classified}`);
    console.log(`   - Software jobs: ${classificationResult.stats.software_count}`);
    console.log(`   - Non-software jobs: ${classificationResult.stats.non_software_count}`);
    console.log(`   - Unknown: ${classificationResult.stats.unknown_count}`);
    console.log(`   - Failed: ${classificationResult.stats.total_failed}`);
    console.log(`   - Duration: ${classificationResult.stats.duration_ms}ms\n`);

    // Track classification metrics
    metrics.updateMetric('jobs_classified', classificationResult.stats.total_classified);
    metrics.updateMetric('unknown_classifications', classificationResult.stats.unknown_count);

    if (classificationResult.failed.length > 0) {
      console.warn(`⚠️  Failed classifications:`);
      classificationResult.failed.forEach((f) => {
        console.warn(`   - ${f.identity_hash}: ${f.error}`);
      });
    }

    // Show classification breakdown
    const breakdown = await JobClassifier.countByCategory();
    console.log(`📈 Classification Breakdown:`);
    console.log(`   - SOFTWARE: ${breakdown.SOFTWARE}`);
    console.log(`   - NON_SOFTWARE: ${breakdown.NON_SOFTWARE}`);
    console.log(`   - UNKNOWN: ${breakdown.UNKNOWN}\n`);

    // Step 4: Query layer - Read examples
    console.log(`\n📖 Running Query Layer Examples...\n`);

    // Example 1: Get active software jobs
    console.log(`🔍 Query 1: Active Software Jobs`);
    const softwareJobs = await JobQueryService.getActiveSoftwareJobs({
      limit: 3,
    });
    console.log(`   Found: ${softwareJobs.total} total, showing ${softwareJobs.count}`);
    softwareJobs.data.forEach((job) => {
      console.log(
        `   • ${job.title} @ ${job.company_name} (${job.location})`
      );
      if (job.classification) {
        console.log(`     Role: ${job.classification.role} | Confidence: ${(job.classification.confidence * 100).toFixed(0)}%`);
      }
    });
    console.log(`   Duration: ${softwareJobs.duration_ms}ms\n`);

    // Example 2: Get jobs by specific role
    console.log(`🔍 Query 2: Backend Jobs`);
    const backendJobs = await JobQueryService.getJobsByRole('backend', {
      limit: 3,
    });
    console.log(`   Found: ${backendJobs.total} backend positions`);
    backendJobs.data.forEach((job) => {
      console.log(`   • ${job.title} @ ${job.company_name}`);
    });
    console.log(`   Duration: ${backendJobs.duration_ms}ms\n`);

    // Example 3: Get newly posted jobs
    console.log(`🔍 Query 3: Jobs Posted in Last 24h`);
    const newJobs = await JobQueryService.getNewJobs(24, { limit: 3 });
    console.log(`   Found: ${newJobs.total} new jobs`);
    newJobs.data.slice(0, 2).forEach((job) => {
      const posted = new Date(job.first_seen_at);
      console.log(
        `   • ${job.title} @ ${job.company_name} (${posted.toLocaleString()})`
      );
    });
    console.log(`   Duration: ${newJobs.duration_ms}ms\n`);

    // Example 4: Get jobs by company
    console.log(`🔍 Query 4: All Airbnb Jobs`);
    const airbnbJobs = await JobQueryService.getJobsByCompany('Airbnb');
    console.log(`   Found: ${airbnbJobs.total} positions`);
    console.log(`   Categories:`);
    let softwareCount = 0;
    for (const job of airbnbJobs.data) {
      if (job.classification?.category === 'SOFTWARE') softwareCount++;
    }
    console.log(`     - Software: ${softwareCount}`);
    console.log(`     - Total: ${airbnbJobs.total}\n`);

    // Example 5: Search jobs
    console.log(`🔍 Query 5: Search "engineer" in job titles/locations`);
    const searchResults = await JobQueryService.searchJobs('engineer', {
      limit: 3,
    });
    console.log(`   Found: ${searchResults.total} matching jobs`);
    searchResults.data.forEach((job) => {
      console.log(`   • ${job.title} @ ${job.company_name}`);
    });
    console.log(`   Duration: ${searchResults.duration_ms}ms\n`);

    // Example 6: Get statistics
    console.log(`📊 Query 6: Overall Statistics`);
    const stats = await JobQueryService.getStatistics();
    console.log(`   Total Jobs: ${stats.total_jobs}`);
    console.log(`   Active: ${stats.active_jobs} | Inactive: ${stats.inactive_jobs}`);
    console.log(`   New (24h): ${stats.new_jobs_24h} | Updated (24h): ${stats.updated_jobs_24h}`);
    console.log(`   Classifications:`);
    console.log(`     - Software: ${stats.software_count}`);
    console.log(`     - Non-Software: ${stats.non_software_count}`);
    console.log(`     - Unknown: ${stats.unknown_count}`);
    console.log(`   By Role: Frontend=${stats.by_role.frontend}, Backend=${stats.by_role.backend}, Fullstack=${stats.by_role.fullstack}, Data=${stats.by_role.data}\n`);

    console.log(`\n✅ Complete Pipeline Executed Successfully!`);
    console.log(`   ✓ Ingestion (sources: ${metrics.getRunMetrics()!.sources_processed}, jobs: ${metrics.getRunMetrics()!.jobs_fetched})`);
    console.log(`   ✓ Classification (software: ${metrics.getRunMetrics()!.jobs_classified - metrics.getRunMetrics()!.unknown_classifications} identified)`);
    console.log(`   ✓ Query Layer (ready for consumption)\n`);

    // Persist metrics and start health server
    console.log(`📊 Persisting metrics...`);
    metrics.markComplete();
    await metrics.persistMetrics();
    console.log(`✓ Metrics persisted for run: ${runId}\n`);

    // Start health endpoints server
    console.log(`🏥 Starting Health Check Server...`);
    await startHealthServer(3001);

  } catch (error) {
    console.error('Error during pipeline:', error);
    metrics.markFailed(error instanceof Error ? error.message : String(error));
    await metrics.persistMetrics();
  } finally {
    await orchestrator.cleanup();
  }
}

main()
