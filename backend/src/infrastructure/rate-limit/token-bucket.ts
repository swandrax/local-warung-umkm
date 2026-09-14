import { cache } from '../cache/valkey';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface RateLimitConfig {
  maxRequests: number;  // Maximum capacity
  windowSeconds: number; // Time window to refill/expire
}

export class TokenBucketRateLimiter {
  private defaultTenantConfig: RateLimitConfig = {
    maxRequests: 30,     // 30 requests per minute per tenant
    windowSeconds: 60,
  };

  private defaultIpConfig: RateLimitConfig = {
    maxRequests: 10,     // 10 requests per minute per IP
    windowSeconds: 60,
  };

  /**
   * Checks whether a request is allowed under the token bucket algorithm.
   * Uses Valkey cache with TTL or memory fallback.
   */
  async consume(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const cacheKey = `ratelimit:${key}`;
    const now = Date.now();

    const record = await cache.get<{ count: number; resetAt: number }>(cacheKey);

    if (!record || now >= record.resetAt) {
      // New window or expired window
      await cache.set(
        cacheKey,
        { count: 1, resetAt: now + config.windowSeconds * 1000 },
        config.windowSeconds
      );
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
      };
    }

    if (record.count >= config.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
      };
    }

    // Increment count
    const nextCount = record.count + 1;
    const remainingSeconds = Math.ceil((record.resetAt - now) / 1000);
    await cache.set(
      cacheKey,
      { count: nextCount, resetAt: record.resetAt },
      Math.max(remainingSeconds, 1)
    );

    return {
      allowed: true,
      remaining: config.maxRequests - nextCount,
    };
  }

  async checkTenant(tenantId: string): Promise<RateLimitResult> {
    return this.consume(`tenant:${tenantId}`, this.defaultTenantConfig);
  }

  async checkIp(ip: string): Promise<RateLimitResult> {
    return this.consume(`ip:${ip}`, this.defaultIpConfig);
  }
}

export const rateLimiter = new TokenBucketRateLimiter();
