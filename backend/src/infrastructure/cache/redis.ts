import Redis from 'ioredis';

/**
 * In-Memory Fallback Cache when Redis instance is not reachable.
 * Prevents system crashes and guarantees uninterrupted local development.
 */
class InMemoryCache {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

export class RedisCacheService {
  private client: Redis | null = null;
  private memoryFallback = new InMemoryCache();
  private isRedisConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 3) {
              return null; // Stop retrying and fallback to memory
            }
            return Math.min(times * 100, 2000);
          },
        });

        this.client.on('connect', () => {
          this.isRedisConnected = true;
          console.log('[RedisCache] Successfully connected to Redis server at:', redisUrl);
        });

        this.client.on('error', (err) => {
          this.isRedisConnected = false;
          console.warn('[RedisCache] Redis connection error, using in-memory cache:', err.message);
        });

        // Trigger lazy connection asynchronously
        this.client.connect().catch(() => {});
      } catch (err: any) {
        console.warn('[RedisCache] Failed to initialize Redis client, falling back to memory:', err.message);
      }
    } else {
      console.info('[RedisCache] No REDIS_URL provided. Running on in-memory cache fallback.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.client) {
        const val = await this.client.get(key);
        if (val) return JSON.parse(val) as T;
      }
    } catch {
      // Fallback to memory on failure
    }

    const memVal = await this.memoryFallback.get(key);
    if (memVal) {
      try {
        return JSON.parse(memVal) as T;
      } catch {
        return memVal as unknown as T;
      }
    }
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const stringVal = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      if (this.isRedisConnected && this.client) {
        if (ttlSeconds > 0) {
          await this.client.set(key, stringVal, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, stringVal);
        }
      }
    } catch {
      // Fallback to memory
    }

    await this.memoryFallback.set(key, stringVal, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.client) {
        await this.client.del(key);
      }
    } catch {
      // ignore
    }
    await this.memoryFallback.del(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.client) {
        const keys = await this.client.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      }
    } catch {
      // ignore
    }
    await this.memoryFallback.delPrefix(prefix);
  }

  // --- Specialized Tenant Context Helpers ---
  tenantKey(tenantId: string, subKey: string) {
    return `tenant:${tenantId}:${subKey}`;
  }

  async getTenantContext<T>(tenantId: string): Promise<T | null> {
    return this.get<T>(this.tenantKey(tenantId, 'ai_context'));
  }

  async setTenantContext<T>(tenantId: string, data: T, ttlSeconds = 600): Promise<void> {
    return this.set(this.tenantKey(tenantId, 'ai_context'), data, ttlSeconds);
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delPrefix(`tenant:${tenantId}:`);
  }
}

// Export singleton cache instance
export const cache = new RedisCacheService();
export const redisCache = cache;
// Backward compatibility alias for CacheService
export { RedisCacheService as CacheService };
