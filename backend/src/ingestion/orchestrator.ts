import { IngestionAdapter, Job } from './base';
import { PlatformAdapter } from './platformAdapter';
import { ApiFetchAdapter } from './apiFetchAdapter';
import { HtmlParseAdapter } from './htmlParseAdapter';
import { BrowserFallbackAdapter } from './browserFallbackAdapter';
import { SourceType, IngestionStrategy } from '../sourceClassifier';
import { NormalizedJob, JobNormalizer } from '../normalization';
import { UniqueJob, JobDeduplicator } from '../deduplication';

export class IngestionOrchestrator {
  private adapters: Map<IngestionStrategy, IngestionAdapter> = new Map();
  private browserAdapter: BrowserFallbackAdapter;

  constructor() {
    this.adapters.set('PLATFORM_ADAPTER', new PlatformAdapter());
    this.adapters.set('API_FETCH', new ApiFetchAdapter());
    this.adapters.set('HTML_PARSE', new HtmlParseAdapter());

    this.browserAdapter = new BrowserFallbackAdapter();
    this.adapters.set('BROWSER_FALLBACK', this.browserAdapter);
  }

  async fetchJobsByStrategy(
    url: string,
    strategy: IngestionStrategy,
    companyContext: {
      id: number;
      name: string;
      source_type: SourceType;
    }
  ): Promise<UniqueJob[]> {
    const adapter = this.adapters.get(strategy);

    if (!adapter) {
      console.warn(`No adapter found for strategy: ${strategy}`);
      return [];
    }

    try {
      console.log(`\n📥 Using ${adapter.name} for: ${url}`);
      const rawJobs = await adapter.fetch(url);

      // ✨ NORMALIZATION BOUNDARY ✨
      // All raw adapter output gets normalized here
      const normalizationResult = JobNormalizer.normalizeBatch(rawJobs, {
        company_id: companyContext.id,
        company_name: companyContext.name,
        source_type: companyContext.source_type,
        ingestion_strategy: strategy,
        adapter_name: adapter.name,
      });

      if (normalizationResult.stats.failed > 0) {
        console.warn(
          `⚠️  ${normalizationResult.stats.failed} jobs failed normalization`
        );
        normalizationResult.failed.forEach((f) => {
          console.warn(`   - ${f.error}`);
        });
      }

      console.log(
        `✅ Normalized ${normalizationResult.stats.successful} jobs in ${normalizationResult.stats.duration_ms}ms`
      );

      // ✨ DEDUPLICATION BOUNDARY ✨
      // All normalized jobs get deduplicated here
      const dedupResult = await JobDeduplicator.deduplicateBatch(
        normalizationResult.normalized
      );

      console.log(`🔐 Deduplication stats:`);
      console.log(`   - Input: ${dedupResult.stats.input_count} jobs`);
      console.log(`   - Unique: ${dedupResult.stats.unique_count}`);
      console.log(`   - New: ${dedupResult.stats.new_count}`);
      console.log(`   - Updated: ${dedupResult.stats.updated_count}`);
      console.log(`   - Duplicates removed: ${dedupResult.stats.duplicate_count}`);
      console.log(`   - Reactivated: ${dedupResult.stats.reactivated_count}`);
      console.log(`   - Duration: ${dedupResult.stats.duration_ms}ms`);

      return dedupResult.unique_jobs;
    } catch (error) {
      console.error(`❌ Error with ${adapter.name}:`, error);
      return [];
    }
  }

  async fetchJobsBySourceType(
    url: string,
    sourceType: SourceType,
    companyContext: {
      id: number;
      name: string;
    }
  ): Promise<UniqueJob[]> {
    const strategyMap: Record<SourceType, IngestionStrategy> = {
      'PLATFORM': 'PLATFORM_ADAPTER',
      'API': 'API_FETCH',
      'STATIC': 'HTML_PARSE',
      'DYNAMIC': 'BROWSER_FALLBACK',
      'UNKNOWN': 'BROWSER_FALLBACK', // Fallback to browser automation
    };

    const strategy = strategyMap[sourceType];
    return this.fetchJobsByStrategy(url, strategy, {
      ...companyContext,
      source_type: sourceType,
    });
  }

  async cleanup(): Promise<void> {
    await this.browserAdapter.cleanup();
  }
}

// Export singleton instance
export const orchestrator = new IngestionOrchestrator();
