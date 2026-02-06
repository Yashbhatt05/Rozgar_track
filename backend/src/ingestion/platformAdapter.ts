import { BaseAdapter, Job } from './base';

export class PlatformAdapter extends BaseAdapter {
  name = 'PLATFORM_ADAPTER';

  async fetch(url: string): Promise<Job[]> {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('greenhouse')) {
      return this.fetchFromGreenhouse(url);
    } else if (urlLower.includes('lever')) {
      return this.fetchFromLever(url);
    } else if (urlLower.includes('ashby')) {
      return this.fetchFromAshby(url);
    } else if (urlLower.includes('smartrecruiters')) {
      return this.fetchFromSmartRecruiters(url);
    }

    throw new Error(`Unknown platform in URL: ${url}`);
  }

  private async fetchFromGreenhouse(url: string): Promise<Job[]> {
    // Extract board name from Greenhouse URL
    // Format: https://boards.greenhouse.io/companyname/jobs
    // or: https://boards.greenhouse.io/companyname
    // or: https://boards-api.greenhouse.io/v1/boards/companyname/jobs
    
    let boardName = '';
    
    // Try different URL patterns
    if (url.includes('boards-api.greenhouse.io')) {
      const match = url.match(/boards\/([^/]+)/);
      boardName = match ? match[1] : '';
    } else if (url.includes('boards.greenhouse.io')) {
      const match = url.match(/greenhouse\.io\/([^/]+)/);
      boardName = match ? match[1] : '';
    }

    if (!boardName) {
      throw new Error('Could not extract board name from Greenhouse URL');
    }

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardName}/jobs`;
    console.log(`  [PLATFORM_ADAPTER] Fetching from Greenhouse: ${apiUrl}`);
    
    const response = await this.retryFetch(apiUrl);
    const data = await response.json();

    return data.jobs.map((job: any) => ({
      id: job.id.toString(),
      title: job.title,
      location: job.location?.name || 'Not specified',
      url: job.absolute_url,
    }));
  }

  private async fetchFromLever(url: string): Promise<Job[]> {
    // Extract company name from Lever URL
    // Format: https://jobs.lever.co/company
    const match = url.match(/lever\.co\/([^/]+)/);
    const companyName = match ? match[1] : '';

    if (!companyName) {
      throw new Error('Could not extract company name from Lever URL');
    }

    const apiUrl = `https://api.lever.co/v0/postings/company?mode=json`;
    const response = await this.retryFetch(apiUrl);
    const data = await response.json();

    return data.postings.map((job: any) => ({
      id: job.id,
      title: job.text,
      location: job.categories.location || 'Not specified',
      url: job.hostedUrl,
    }));
  }

  private async fetchFromAshby(url: string): Promise<Job[]> {
    // Ashby uses a different approach - typically embedded on company site
    // This is a placeholder for future implementation
    throw new Error('Ashby adapter not yet implemented');
  }

  private async fetchFromSmartRecruiters(url: string): Promise<Job[]> {
    // SmartRecruiters uses their own API
    // This is a placeholder for future implementation
    throw new Error('SmartRecruiters adapter not yet implemented');
  }
}
