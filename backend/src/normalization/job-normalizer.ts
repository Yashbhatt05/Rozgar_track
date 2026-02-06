import { NormalizedJob, NormalizationResult } from './normalized-job';
import { SourceType, IngestionStrategy } from '../sourceClassifier';

interface RawJob {
  id?: string | number;
  title?: string;
  location?: string;
  url?: string;
  [key: string]: any;
}

export class JobNormalizer {
  /**
   * Normalize a single raw job to standard format
   */
  static normalize(
    rawJob: RawJob,
    context: {
      company_id: number;
      company_name: string;
      source_type: SourceType;
      ingestion_strategy: IngestionStrategy;
      adapter_name: string;
    }
  ): NormalizedJob {
    const now = new Date();
    const warnings: string[] = [];
    const original_fields: Record<string, string> = {};

    // Normalize ID
    let id = this.normalizeId(rawJob, context, original_fields, warnings);

    // Normalize title
    let title = this.normalizeTitle(rawJob, original_fields, warnings);
    if (!title) {
      throw new Error('Job must have a title');
    }

    // Normalize location
    let location = this.normalizeLocation(rawJob, original_fields, warnings);

    // Normalize URL
    let url = this.normalizeUrl(rawJob, original_fields, warnings);

    return {
      id,
      company_id: context.company_id,
      company_name: context.company_name,
      title,
      location,
      url,
      source_type: context.source_type,
      ingestion_strategy: context.ingestion_strategy,
      fetched_at: now,
      normalized_at: now,
      raw_data: rawJob,
      metadata: {
        original_fields: Object.keys(original_fields).length > 0 ? original_fields : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        adapter_name: context.adapter_name,
      },
    };
  }

  /**
   * Normalize a batch of raw jobs
   */
  static normalizeBatch(
    rawJobs: RawJob[],
    context: {
      company_id: number;
      company_name: string;
      source_type: SourceType;
      ingestion_strategy: IngestionStrategy;
      adapter_name: string;
    }
  ): NormalizationResult {
    const startTime = Date.now();
    const normalized: NormalizedJob[] = [];
    const failed: Array<{ raw_job: any; error: string; adapter_name?: string }> = [];

    for (const rawJob of rawJobs) {
      try {
        const job = this.normalize(rawJob, context);
        normalized.push(job);
      } catch (error) {
        failed.push({
          raw_job: rawJob,
          error: error instanceof Error ? error.message : String(error),
          adapter_name: context.adapter_name,
        });
      }
    }

    return {
      normalized,
      failed,
      stats: {
        total_input: rawJobs.length,
        successful: normalized.length,
        failed: failed.length,
        duration_ms: Date.now() - startTime,
      },
    };
  }

  // ============ Field Normalization Methods ============

  private static normalizeId(
    rawJob: RawJob,
    context: { company_name: string; source_type: SourceType },
    original_fields: Record<string, string>,
    warnings: string[]
  ): string {
    // Try common ID field names
    const idCandidates = ['id', 'job_id', 'jobId', 'ID', '_id', 'posting_id'];
    let rawId: any = null;
    let usedField = '';

    for (const field of idCandidates) {
      if (field in rawJob && rawJob[field]) {
        rawId = rawJob[field];
        usedField = field;
        break;
      }
    }

    if (rawId) {
      original_fields['id'] = usedField;
      // Clean ID: remove special chars, keep only alphanumeric, dash, underscore
      const cleanId = String(rawId).replace(/[^a-zA-Z0-9_-]/g, '');
      return `${context.company_name.toLowerCase()}_${cleanId}`;
    }

    // Fallback: generate from title
    if (rawJob.title) {
      const titleId = rawJob.title
        .toLowerCase()
        .substring(0, 30)
        .replace(/[^a-z0-9]/g, '-');
      const timestamp = Date.now();
      return `${context.company_name.toLowerCase()}_${titleId}_${timestamp}`;
    }

    // Last resort
    warnings.push('No ID field found, generated random ID');
    return `${context.company_name.toLowerCase()}_${Math.random().toString(36).substring(7)}`;
  }

  private static normalizeTitle(
    rawJob: RawJob,
    original_fields: Record<string, string>,
    warnings: string[]
  ): string {
    const titleCandidates = ['title', 'position', 'job_title', 'jobTitle', 'name', 'text'];

    for (const field of titleCandidates) {
      if (field in rawJob && rawJob[field] && typeof rawJob[field] === 'string') {
        const title = rawJob[field].trim();
        if (title.length > 0) {
          original_fields['title'] = field;
          return title;
        }
      }
    }

    warnings.push('No valid title field found');
    return '';
  }

  private static normalizeLocation(
    rawJob: RawJob,
    original_fields: Record<string, string>,
    warnings: string[]
  ): string {
    // Try common location patterns
    const locationCandidates = [
      'location',
      'city',
      'region',
      'workplace_type',
      'workplaceType',
      'office',
    ];

    // Try direct string fields
    for (const field of locationCandidates) {
      if (field in rawJob) {
        const value = rawJob[field];

        // Handle string
        if (typeof value === 'string' && value.trim()) {
          original_fields['location'] = field;
          return value.trim();
        }

        // Handle object with name property
        if (typeof value === 'object' && value !== null && 'name' in value) {
          const name = String(value.name).trim();
          if (name) {
            original_fields['location'] = `${field}.name`;
            return name;
          }
        }
      }
    }

    // Check for nested object patterns
    if (typeof rawJob.location === 'object' && rawJob.location !== null) {
      const locObj = rawJob.location as Record<string, any>;
      if (locObj.name) {
        original_fields['location'] = 'location.name';
        return String(locObj.name).trim();
      }
      if (locObj.city) {
        original_fields['location'] = 'location.city';
        return String(locObj.city).trim();
      }
    }

    // Fallback
    original_fields['location'] = 'default';
    return 'Not specified';
  }

  private static normalizeUrl(
    rawJob: RawJob,
    original_fields: Record<string, string>,
    warnings: string[]
  ): string {
    const urlCandidates = [
      'url',
      'link',
      'href',
      'job_url',
      'jobUrl',
      'application_url',
      'applicationUrl',
      'absolute_url',
      'absoluteUrl',
      'hostedUrl',
    ];

    for (const field of urlCandidates) {
      if (field in rawJob && rawJob[field]) {
        const url = String(rawJob[field]).trim();
        // Validate URL format
        if (url.startsWith('http://') || url.startsWith('https://')) {
          original_fields['url'] = field;
          return url;
        }
      }
    }

    // URL might be missing or invalid
    warnings.push('No valid URL found');
    original_fields['url'] = 'missing';
    return '';
  }
}
