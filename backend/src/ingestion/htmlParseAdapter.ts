import { BaseAdapter, Job } from './base';
import { chromium } from 'playwright';

export class HtmlParseAdapter extends BaseAdapter {
  name = 'HTML_PARSE';

  async fetch(url: string): Promise<Job[]> {
    console.log(`[HTML_PARSE] Fetching from ${url}`);

    try {
      const response = await this.retryFetch(url);
      const html = await response.text();

      // Parse the HTML and extract job listings
      const jobs = this.parseHtml(html, url);

      console.log(`[HTML_PARSE] Found ${jobs.length} jobs`);
      return jobs;
    } catch (error) {
      console.error(`[HTML_PARSE] Error parsing ${url}:`, error);
      return [];
    }
  }

  private parseHtml(html: string, baseUrl: string): Job[] {
    const jobs: Job[] = [];

    // Common patterns for job listings in HTML
    // This is a basic implementation - can be enhanced with more selectors

    // Pattern 1: job-item or job-card divs
    const jobCardRegex =
      /<(div|article|li)[^>]*(?:class|id)="[^"]*(?:job|position)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = jobCardRegex.exec(html)) !== null) {
      const jobHtml = match[2];
      const job = this.extractJobFromHtml(jobHtml, baseUrl);
      if (job) {
        jobs.push(job);
      }
    }

    // If no jobs found with pattern matching, try table-based listings
    if (jobs.length === 0) {
      jobs.push(...this.parseTableJobs(html, baseUrl));
    }

    return jobs;
  }

  private extractJobFromHtml(jobHtml: string, baseUrl: string): Job | null {
    // Extract title
    const titleMatch = jobHtml.match(
      /<(?:h[1-6]|a|span)[^>]*>([^<]*)\s*<\/(?:h[1-6]|a|span)>/i
    );
    const title = titleMatch ? titleMatch[1].trim() : '';

    if (!title) return null;

    // Extract location
    const locationMatch = jobHtml.match(/(?:location|city).*?:\s*([^<,\n]+)/i);
    const location = locationMatch ? locationMatch[1].trim() : 'Not specified';

    // Extract URL
    const urlMatch = jobHtml.match(/href="([^"]*(?:job|position)[^"]*)"/i);
    let url = '';
    if (urlMatch) {
      url = urlMatch[1];
      if (!url.startsWith('http')) {
        url = new URL(url, baseUrl).href;
      }
    }

    // Generate ID from title
    const id = title.toLowerCase().replace(/\s+/g, '-');

    return {
      id,
      title,
      location,
      url,
    };
  }

  private parseTableJobs(html: string, baseUrl: string): Job[] {
    const jobs: Job[] = [];

    // Look for table rows containing job info
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const cells = rowMatch[1].match(/<td[^>]*>([^<]*)<\/td>/gi);
      if (cells && cells.length >= 2) {
        const title = cells[0].replace(/<[^>]*>/g, '').trim();
        const location = cells[1].replace(/<[^>]*>/g, '').trim();

        if (title) {
          const id = title.toLowerCase().replace(/\s+/g, '-');
          jobs.push({
            id,
            title,
            location,
            url: baseUrl,
          });
        }
      }
    }

    return jobs;
  }
}
