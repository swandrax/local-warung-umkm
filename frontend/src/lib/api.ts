const BASE_URL = 'http://localhost:3000/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  retries?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  let url = `${BASE_URL}${endpoint}`;
  
  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    url += `?${searchParams.toString()}`;
  }

  options.credentials = 'include';
  
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.body && typeof options.body !== 'string') {
    options.body = JSON.stringify(options.body);
  }

  const maxRetries = options.method === 'GET' ? (options.retries ?? 2) : 0;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();

      if (!response.ok) {
        // If 5xx server error and retries remain for GET
        if (response.status >= 500 && attempt < maxRetries) {
          attempt++;
          await wait(attempt * 400);
          continue;
        }
        throw {
          status: response.status,
          ...data
        };
      }

      return data as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      // Network failure / offline
      if (attempt < maxRetries) {
        attempt++;
        await wait(attempt * 400);
        continue;
      }
      throw {
        status: 0,
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
        }
      };
    }
  }
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, string>, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET', params }),
  
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'POST', body }),
  
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'PUT', body }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
