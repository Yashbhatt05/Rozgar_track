import { BaseAdapter, Job } from './base';

export class ApiFetchAdapter extends BaseAdapter {
  name = 'API_FETCH';

  async fetch(url: string): Promise<Job[]> {
    console.log(`[API_FETCH] Fetching from ${url}`);

    const response = await this.retryFetch(url);
    const data = await response.json();

    // Normalize different API response formats
    const jobs = this.normalizeResponse(data);

    console.log(`[API_FETCH] Found ${jobs.length} jobs`);
    return jobs;
  }

  private normalizeResponse(data: any): Job[] {
    // Handle various API response structures
    let jobsArray: any[] = [];

    if (Array.isArray(data)) {
      jobsArray = data;
    } else if (data.jobs) {
      jobsArray = data.jobs;
    } else if (data.postings) {
      jobsArray = data.postings;
    } else if (data.positions) {
      jobsArray = data.positions;
    } else if (data.data) {
      jobsArray = Array.isArray(data.data) ? data.data : [];
    }

    return jobsArray.map((job: any) => this.normalizeJob(job));
  }

  private normalizeJob(job: any): Job {
    return {
      id: job.id || job.ID || String(Math.random()),
      title: job.title || job.name || job.position || 'Untitled',
      location: this.extractLocation(job),
      url: job.url || job.link || job.absolute_url || '',
    };
  }

  private extractLocation(job: any): string {
    if (typeof job.location === 'string') {
      return job.location;
    } else if (job.location && typeof job.location === 'object') {
      if (job.location.name) return job.location.name;
      if (job.location.city) return job.location.city;
    }
    return job.city || job.country || 'Not specified';
  }
}
