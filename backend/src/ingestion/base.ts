export interface Job {
  id: string;
  title: string;
  location: string;
  url: string;
}

export interface IngestionAdapter {
  name: string;
  fetch(url: string): Promise<Job[]>;
}

// Base adapter class
export abstract class BaseAdapter implements IngestionAdapter {
  abstract name: string;

  abstract fetch(url: string): Promise<Job[]>;

  protected async retryFetch(
    url: string,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) return response;
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error as Error;
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }
}
