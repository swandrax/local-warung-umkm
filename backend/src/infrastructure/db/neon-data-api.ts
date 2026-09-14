/**
 * Neon Data API (Serverless HTTP / PostgREST Client)
 * Allows executing queries directly over HTTP without establishing persistent TCP connection pools.
 * Ideal for edge functions, serverless compute, and rapid read replicas.
 */
export class NeonDataApiClient {
  private baseUrl: string;

  constructor(baseUrl = process.env.NEON_DATA_API_URL) {
    this.baseUrl = (baseUrl || 'https://ep-small-butterfly-a7sfee50.apirest.ap-southeast-2.aws.neon.tech/neondb/rest/v1').replace(/\/$/, '');
  }

  /**
   * Performs a RESTful query against a table using PostgREST syntax.
   * Example: query('products', { select: 'id,name,price', status: 'eq.PUBLISHED', limit: '10' })
   */
  async query<T = any>(table: string, queryParams: Record<string, string> = {}): Promise<T[]> {
    const url = new URL(`${this.baseUrl}/${table}`);
    for (const [key, val] of Object.entries(queryParams)) {
      url.searchParams.set(key, val);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Neon Data API query error (${response.status}): ${errorText}`);
    }

    return (await response.json()) as T[];
  }

  /**
   * Pings the Neon Data API endpoint to verify connectivity.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        method: 'HEAD',
      });
      return res.ok || res.status === 404 || res.status === 401; // reachable
    } catch {
      return false;
    }
  }
}

export const neonDataApi = new NeonDataApiClient();
