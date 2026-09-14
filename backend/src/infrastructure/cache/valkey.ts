import Redis from 'ioredis';

/**
 * In-Memory Fallback Cache when Valkey/Redis instance is not reachable.
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

export class CacheService {
  private client: Redis | null = null;
  private memoryFallback = new InMemoryCache();
  private isRedisConnected = false;

  constructor() {
    const redisUrl = process.env.VALKEY_URL || process.env.REDIS_URL;
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
          console.log('[CacheService] Connected to Valkey / Redis instance.');
        });

        this.client.on('error', (err) => {
          if (this.isRedisConnected) {
            console.warn('[CacheService] Valkey error, switching to in-memory fallback:', err.message);
          }
          this.isRedisConnected = false;
        });

        this.client.connect().catch((err) => {
          console.info('[CacheService] Valkey not reachable, using in-memory cache fallback.');
          this.isRedisConnected = false;
        });
      } catch (err) {
        console.warn('[CacheService] Initialization fallback to in-memory cache.');
        this.isRedisConnected = false;
      }
    } else {
      console.info('[CacheService] No VALKEY_URL / REDIS_URL provided. Running on in-memory cache fallback.');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.client) {
        const raw = await this.client.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      }
    } catch (err) {
      console.warn(`[CacheService] Error reading Redis key ${key}, falling back to memory.`);
    }

    const fallbackRaw = await this.memoryFallback.get(key);
    return fallbackRaw ? (JSON.parse(fallbackRaw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      if (this.isRedisConnected && this.client) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      console.warn(`[CacheService] Error writing Redis key ${key}, falling back to memory.`);
    }

    await this.memoryFallback.set(key, serialized, ttlSeconds);
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

export const cache = new CacheService();
