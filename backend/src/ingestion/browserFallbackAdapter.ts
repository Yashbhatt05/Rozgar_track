import { BaseAdapter, Job } from './base';
import { chromium, Browser, Page } from 'playwright';

export class BrowserFallbackAdapter extends BaseAdapter {
  name = 'BROWSER_FALLBACK';
  private browser: Browser | null = null;

  async fetch(url: string): Promise<Job[]> {
    console.log(`[BROWSER_FALLBACK] Fetching from ${url} with Playwright`);

    try {
      if (!this.browser) {
        this.browser = await chromium.launch();
      }

      const page = await this.browser.newPage();

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for job listings to load
        await page.waitForSelector('[data-testid="job"], .job-item, .position', {
          timeout: 5000,
        }).catch(() => {
          // If specific selectors don't exist, continue anyway
        });

        // Extract jobs from the page
        const jobs = await page.evaluate(() => {
          const jobElements = document.querySelectorAll(
            '[data-testid="job"], .job-item, .position, [class*="job"], [class*="position"]'
          );

          const jobs: Job[] = [];
          jobElements.forEach((el) => {
            const title =
              el.querySelector('h2, h3, h4, .title, .job-title, .position-title')
                ?.textContent?.trim() || '';
            const location =
              el.querySelector('.location, .city, [class*="location"]')
                ?.textContent?.trim() || 'Not specified';
            const link =
              el.querySelector('a')?.getAttribute('href') || el.getAttribute('href') || '';

            if (title) {
              jobs.push({
                id: title.toLowerCase().replace(/\s+/g, '-'),
                title,
                location,
                url: link,
              });
            }
          });

          return jobs;
        });

        console.log(`[BROWSER_FALLBACK] Found ${jobs.length} jobs`);
        return jobs;
      } finally {
        await page.close();
      }
    } catch (error) {
      console.error(`[BROWSER_FALLBACK] Error fetching ${url}:`, error);
      return [];
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
