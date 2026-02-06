import { db } from './db';
import { companies } from './db/schema';
import { eq, isNull } from 'drizzle-orm';

// Source Type - describes the nature of the career page
export type SourceType = 'PLATFORM' | 'API' | 'STATIC' | 'DYNAMIC' | 'UNKNOWN';

// Ingestion Strategy - describes how we fetch the data
export type IngestionStrategy = 
  | 'PLATFORM_ADAPTER'  // For PLATFORM source type
  | 'API_FETCH'         // For API source type
  | 'HTML_PARSE'        // For STATIC source type
  | 'BROWSER_FALLBACK'  // For DYNAMIC source type
  | 'ON_DEMAND';        // Fallback

interface ClassificationResult {
  sourceType: SourceType;
  ingestionStrategy: IngestionStrategy;
  reason: string;
}

// Map SourceType to IngestionStrategy
const strategyMap: Record<SourceType, IngestionStrategy> = {
  'PLATFORM': 'PLATFORM_ADAPTER',
  'API': 'API_FETCH',
  'STATIC': 'HTML_PARSE',
  'DYNAMIC': 'BROWSER_FALLBACK',
  'UNKNOWN': 'ON_DEMAND',
};

// List of known hiring platforms
const KNOWN_PLATFORMS = [
  'greenhouse.io',
  'lever.co',
  'ashby.com',
  'smartrecruiters.com',
  'recruitee.com',
  'apply.workable.com',
  'boards.greenhouse.io',
  'boards.lever.co',
];

// Classification rules based on URL patterns and company characteristics
const classifySource = (
  companyName: string,
  careerUrl: string
): ClassificationResult => {
  const urlLower = careerUrl.toLowerCase();

  // 1. Detect PLATFORM sources (known hiring platforms)
  for (const platform of KNOWN_PLATFORMS) {
    if (urlLower.includes(platform)) {
      return {
        sourceType: 'PLATFORM',
        ingestionStrategy: 'PLATFORM_ADAPTER',
        reason: `Detected ${platform} hiring platform`,
      };
    }
  }

  // 2. Detect API sources
  if (
    urlLower.includes('api.') ||
    urlLower.includes('/api/') ||
    urlLower.includes('/graphql') ||
    urlLower.includes('/v1/') ||
    urlLower.includes('/v2/') ||
    (urlLower.includes('json') && urlLower.includes('careers'))
  ) {
    return {
      sourceType: 'API',
      ingestionStrategy: 'API_FETCH',
      reason: 'Detected API endpoint',
    };
  }

  // 3. Detect STATIC sources (simple career pages)
  if (
    urlLower.includes('/careers') ||
    urlLower.includes('/jobs') ||
    urlLower.includes('/positions') ||
    urlLower.includes('/hiring')
  ) {
    return {
      sourceType: 'STATIC',
      ingestionStrategy: 'HTML_PARSE',
      reason: 'Detected static careers page',
    };
  }

  // 4. Default to DYNAMIC for custom domain career sites
  if (
    urlLower.endsWith('/careers') ||
    urlLower.endsWith('/jobs') ||
    urlLower.includes('careers.')
  ) {
    return {
      sourceType: 'DYNAMIC',
      ingestionStrategy: 'BROWSER_FALLBACK',
      reason: 'Suspected dynamic SPA career site',
    };
  }

  // Fallback
  return {
    sourceType: 'UNKNOWN',
    ingestionStrategy: 'ON_DEMAND',
    reason: 'Could not determine source type',
  };
};

export async function classifyAndUpdateSources(): Promise<void> {
  try {
    // Fetch all companies without ingestion_strategy
    const unclassifiedCompanies = await db
      .select()
      .from(companies)
      .where(isNull(companies.ingestion_strategy));

    console.log(
      `Found ${unclassifiedCompanies.length} unclassified companies\n`
    );

    for (const company of unclassifiedCompanies) {
      const classification = classifySource(
        company.company_name,
        company.career_url
      );

      // Update the company with classification
      await db
        .update(companies)
        .set({
          source_type: classification.sourceType,
          ingestion_strategy: classification.ingestionStrategy,
          last_checked_at: new Date(),
        })
        .where(eq(companies.id, company.id));

      console.log(
        `✓ ${company.company_name}`
      );
      console.log(
        `  Source Type: ${classification.sourceType}`
      );
      console.log(
        `  Ingestion Strategy: ${classification.ingestionStrategy}`
      );
      console.log(
        `  Reason: ${classification.reason}\n`
      );
    }

    console.log(`✅ Classification complete!`);
  } catch (error) {
    console.error('Error classifying sources:', error);
    throw error;
  }
}
