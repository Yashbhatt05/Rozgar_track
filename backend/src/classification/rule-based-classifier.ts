import {
  JobClassification,
  JobCategory,
  JobRole,
  ClassificationResult,
  JobForClassification,
} from './classification-types';

const CLASSIFIER_VERSION = '1.0-rule-based';

/**
 * Software Job Indicator Keywords
 * High confidence indicators of a software engineering role
 */
const SOFTWARE_KEYWORDS = {
  frontend: [
    'frontend',
    'front-end',
    'ui developer',
    'react',
    'vue',
    'angular',
    'javascript',
    'typescript',
    'html',
    'css',
    'web developer',
  ],
  backend: [
    'backend',
    'back-end',
    'server',
    'api',
    'python',
    'java',
    'go',
    'rust',
    'c++',
    'nodejs',
    'node.js',
    'database',
    'sql',
    'mongodb',
    'postgres',
  ],
  fullstack: [
    'fullstack',
    'full-stack',
    'full stack',
    'full-time developer',
  ],
  data: [
    'data engineer',
    'machine learning',
    'ml engineer',
    'data scientist',
    'analytics engineer',
    'data pipeline',
    'spark',
    'hadoop',
  ],
  devops: [
    'devops',
    'dev-ops',
    'site reliability',
    'sre',
    'kubernetes',
    'docker',
    'cloud engineer',
    'infrastructure',
    'terraform',
    'aws',
    'azure',
    'gcp',
  ],
  qa: [
    'qa engineer',
    'quality assurance',
    'test engineer',
    'automation engineer',
    'software tester',
  ],
};

/**
 * False Positive Keywords
 * Exclude these to avoid marking non-software roles as software
 */
const FALSE_POSITIVE_KEYWORDS = [
  'sales engineer',
  'solutions engineer',
  'customer engineer',
  'implementation engineer',
  'technical support',
  'support engineer',
];

/**
 * RuleBasedClassifier
 *
 * Deterministic, rule-based job classification.
 * - Single pass through keywords
 * - Title has priority
 * - Avoids false positives
 * - Idempotent & versionable
 */
export class RuleBasedClassifier {
  /**
   * Classify a batch of jobs
   */
  static classifyBatch(jobs: JobForClassification[]): ClassificationResult {
    const startTime = Date.now();
    const classified: JobClassification[] = [];
    const failed: ClassificationResult['failed'] = [];

    let software_count = 0;
    let non_software_count = 0;
    let unknown_count = 0;

    for (const job of jobs) {
      try {
        const result = this.classifySingleJob(job);
        classified.push(result);

        if (result.category === 'SOFTWARE') {
          software_count++;
        } else if (result.category === 'NON_SOFTWARE') {
          non_software_count++;
        } else {
          unknown_count++;
        }
      } catch (error) {
        failed.push({
          identity_hash: job.identity_hash,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      classified,
      failed,
      stats: {
        total_input: jobs.length,
        total_classified: classified.length,
        total_failed: failed.length,
        software_count,
        non_software_count,
        unknown_count,
        duration_ms: Date.now() - startTime,
      },
    };
  }

  /**
   * Classify a single job
   */
  private static classifySingleJob(job: JobForClassification): JobClassification {
    const titleLower = job.title.toLowerCase();

    // Check for false positives first
    if (this.isFalsePositive(titleLower)) {
      return {
        identity_hash: job.identity_hash,
        category: 'NON_SOFTWARE',
        role: 'other',
        confidence: 0.9,
      };
    }

    // Check for software role(s)
    const matchedRoles: {
      role: JobRole;
      confidence: number;
    }[] = [];

    for (const [role, keywords] of Object.entries(SOFTWARE_KEYWORDS)) {
      const confidence = this.calculateRoleConfidence(titleLower, keywords);
      if (confidence > 0) {
        matchedRoles.push({
          role: role as JobRole,
          confidence,
        });
      }
    }

    if (matchedRoles.length === 0) {
      // No software keywords matched
      return {
        identity_hash: job.identity_hash,
        category: 'UNKNOWN',
        role: 'unknown',
        confidence: 0.3,
      };
    }

    // Sort by confidence and pick highest
    matchedRoles.sort((a, b) => b.confidence - a.confidence);
    const topRole = matchedRoles[0];

    return {
      identity_hash: job.identity_hash,
      category: 'SOFTWARE',
      role: topRole.role,
      confidence: Math.min(topRole.confidence, 1.0),
    };
  }

  /**
   * Check if title matches false positive patterns
   */
  private static isFalsePositive(titleLower: string): boolean {
    return FALSE_POSITIVE_KEYWORDS.some((keyword) => titleLower.includes(keyword));
  }

  /**
   * Calculate confidence for a role based on keyword matches
   * - Exact phrase match = high confidence
   * - Single word match = medium confidence
   * - Multiple matches = higher confidence
   */
  private static calculateRoleConfidence(titleLower: string, keywords: string[]): number {
    let score = 0;
    let matches = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact phrase match
      if (titleLower.includes(keywordLower)) {
        score += 1.0;
        matches++;
      }
    }

    if (matches === 0) {
      return 0;
    }

    // Base confidence: higher with more matches
    // 1 match = 0.6, 2 matches = 0.75, 3+ matches = 0.9
    const baseConfidence = Math.min(0.5 + matches * 0.15, 0.9);

    return baseConfidence;
  }
}
