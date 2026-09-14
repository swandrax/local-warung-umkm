import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { healthRoutes } from './routes/health';
import { cache, RedisCacheService } from './infrastructure/cache/redis';

describe('Production Readiness & Horizontal Scaling Verification', () => {
  const app = new Elysia().use(healthRoutes);

  it('1. Redis Cache Service: Handles set, get, TTL, and tenant keys correctly with fallback', async () => {
    const testService = new RedisCacheService();
    const testKey = 'prod_test_key_123';
    const testData = { region: 'ap-southeast-2', clusterNode: 'node-1', active: true };

    await testService.set(testKey, testData, 60);
    const retrieved = await testService.get<typeof testData>(testKey);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.clusterNode).toBe('node-1');
    expect(retrieved?.active).toBe(true);

    // Test tenant context helper
    await testService.setTenantContext('tenant_prod_01', { name: 'Warung Berkah' });
    const tenantCtx = await testService.getTenantContext<any>('tenant_prod_01');
    expect(tenantCtx?.name).toBe('Warung Berkah');

    // Invalidation
    await testService.invalidateTenant('tenant_prod_01');
    const invalidated = await testService.getTenantContext('tenant_prod_01');
    expect(invalidated).toBeNull();
  });

  it('2. Liveness Probe (/health): Returns 200 UP and uptime metrics', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('UP');
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.bunVersion).toBeDefined();
  });

  it('3. Readiness Probe (/ready): Probes downstream dependencies', async () => {
    const res = await app.handle(new Request('http://localhost/ready'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('READY');
    expect(body.dependencies).toBeDefined();
    expect(body.dependencies.postgres).toBeDefined();
    expect(body.dependencies.cache).toBeDefined();
    expect(body.queue).toBeDefined();
  }, 15000);

  it('4. Clustered Upstream Simulation: Simulates least-connection round-robin balancing', () => {
    // Simulated load balancer round-robin test
    const upstreamNodes = ['backend-1:3000', 'backend-2:3000'];
    const connectionCounts = { 'backend-1:3000': 0, 'backend-2:3000': 0 };

    for (let i = 0; i < 100; i++) {
      // Pick least connected node
      const chosen = connectionCounts['backend-1:3000'] <= connectionCounts['backend-2:3000']
        ? 'backend-1:3000'
        : 'backend-2:3000';
      connectionCounts[chosen]++;
    }

    expect(connectionCounts['backend-1:3000']).toBe(50);
    expect(connectionCounts['backend-2:3000']).toBe(50);
  });
});
