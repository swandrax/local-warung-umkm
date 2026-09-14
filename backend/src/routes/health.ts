import { Elysia } from 'elysia';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { checkAstraConnection } from '../db/astra';
import { cache } from '../infrastructure/cache/redis';
import { taskQueue } from '../infrastructure/queue/priority-queue';

const startedAt = Date.now();

export const healthRoutes = new Elysia()
  /**
   * Fast Liveness Probe: Used by Kubernetes / Docker / Nginx to check if process is alive.
   * Returns 200 immediately without hitting upstream databases.
   */
  .get('/health', () => {
    return {
      status: 'UP',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
    };
  })

  /**
   * Deep Readiness Probe: Checks if all downstream dependencies (PostgreSQL, Astra DB, Cache)
   * are healthy and ready to serve traffic.
   */
  .get('/ready', async ({ set }) => {
    const checks: Record<string, { healthy: boolean; latencyMs?: number; message?: string }> = {};
    let isReady = true;

    // 1. Neon PostgreSQL Database Check
    const dbStart = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      checks.postgres = { healthy: true, latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      isReady = false;
      checks.postgres = { healthy: false, latencyMs: Date.now() - dbStart, message: err.message };
    }

    // 2. DataStax Astra DB Probe
    const astraStart = Date.now();
    try {
      const astraStatus = await checkAstraConnection();
      checks.astraDb = {
        healthy: astraStatus.connected,
        latencyMs: Date.now() - astraStart,
        message: astraStatus.error || astraStatus.status,
      };
      if (!astraStatus.connected) {
        // Non-fatal warning if Astra is still provisioning or optional
        checks.astraDb.healthy = false;
      }
    } catch (err: any) {
      checks.astraDb = { healthy: false, latencyMs: Date.now() - astraStart, message: err.message };
    }

    // 3. Cache Service Check
    const cacheStart = Date.now();
    try {
      await cache.set('probe:ready', 'ok', 5);
      const val = await cache.get('probe:ready');
      checks.cache = {
        healthy: val === 'ok',
        latencyMs: Date.now() - cacheStart,
        message: 'L1/L2 cache active',
      };
    } catch (err: any) {
      checks.cache = { healthy: false, latencyMs: Date.now() - cacheStart, message: err.message };
    }

    // 4. Queue Backpressure Status
    const queueStatus = {
      totalPending: taskQueue.totalPending,
      isBackpressureActive: taskQueue.isBackpressureActive(),
      isHealthy: true,
    };

    if (!isReady) {
      set.status = 503;
    }

    return {
      status: isReady ? 'READY' : 'DEGRADED',
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      dependencies: checks,
      queue: queueStatus,
      memoryUsage: process.memoryUsage(),
    };
  });
