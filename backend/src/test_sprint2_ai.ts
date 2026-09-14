import { describe, it, expect } from 'bun:test';
import { cache } from './infrastructure/cache/valkey';
import { rateLimiter } from './infrastructure/rate-limit/token-bucket';
import { AIGateway, CircuitState } from './ai/gateway';
import { AgentRouter, AgentType } from './ai/router';
import { GroqProvider, type AIContext } from './ai/providers';

describe('Stage 2: AI Customer Service & Infrastructure Architecture', () => {
  const dummyTenantId = 'test_mitra_001';

  it('1. Cache Service: handles set, get, del and tenant context properly', async () => {
    await cache.set('unit_test_key', { message: 'hello valkey' }, 60);
    const val = await cache.get<{ message: string }>('unit_test_key');
    expect(val).not.toBeNull();
    expect(val?.message).toBe('hello valkey');

    // Test Tenant Context Caching
    await cache.setTenantContext(dummyTenantId, { businessName: 'Warung Berkah' });
    const tenantContext = await cache.getTenantContext<{ businessName: string }>(dummyTenantId);
    expect(tenantContext?.businessName).toBe('Warung Berkah');

    // Invalidation
    await cache.invalidateTenant(dummyTenantId);
    const afterInvalidation = await cache.getTenantContext(dummyTenantId);
    expect(afterInvalidation).toBeNull();
  });

  it('2. Token Bucket Rate Limiter: allows up to limit and rejects excess', async () => {
    const config = { maxRequests: 3, windowSeconds: 10 };
    const key = `test_limit_${Date.now()}`;

    const r1 = await rateLimiter.consume(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await rateLimiter.consume(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await rateLimiter.consume(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request must be rejected
    const r4 = await rateLimiter.consume(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('3. Circuit Breaker: trips to OPEN after consecutive failures', async () => {
    // Failing provider
    const failingProvider = {
      generate: async () => { throw new Error('Groq Upstream 500'); },
      stream: async function* () {},
      healthCheck: async () => false,
    };

    const gateway = new AIGateway(failingProvider, {
      failureThreshold: 2,
      cooldownPeriodMs: 1000,
      timeoutMs: 500,
      maxRetries: 0,
    });

    const context: AIContext = {
      tenantId: dummyTenantId,
      conversationId: 'conv_fail',
      windowedHistory: [],
    };

    // Attempt 1 -> Fail
    await gateway.execute(context, 'Hi');
    expect(gateway.getCircuitState()).toBe(CircuitState.CLOSED);

    // Attempt 2 -> Trips Circuit to OPEN
    await gateway.execute(context, 'Hi');
    expect(gateway.getCircuitState()).toBe(CircuitState.OPEN);

    // Attempt 3 -> Fails fast with circuit breaker message without calling upstream
    const fastFail = await gateway.execute(context, 'Hi');
    expect(fastFail.message).toContain('pemeliharaan otomatis');
  });

  it('4. Agent Router: correctly classifies intents into specialized agents', async () => {
    const provider = new GroqProvider('mock');
    const router = new AgentRouter(provider);

    expect(await router.classifyIntent('Ada komplain nih, admin manusia tolong')).toBe(AgentType.HANDOFF);
    expect(await router.classifyIntent('Berapa harga kopi robusta hari ini?')).toBe(AgentType.PRODUCT);
    expect(await router.classifyIntent('Lacak status pesanan resi 123')).toBe(AgentType.ORDER);
    expect(await router.classifyIntent('Jam berapa toko buka?')).toBe(AgentType.FAQ);
  });

  it('5. FAQ & Product Agent: Fast-path execution delivers instant answer with 0 tokens', async () => {
    const provider = new GroqProvider('mock');
    const router = new AgentRouter(provider);

    const context: AIContext = {
      tenantId: dummyTenantId,
      conversationId: 'conv_fast_path',
      tenantInfo: {
        businessName: 'Warung Kopi Nusantara',
        address: 'Jl. Merdeka No. 45, Jakarta',
        phone: '08123456789',
        operatingHours: { monday: { isOpen: true, openTime: '08:00', closeTime: '22:00' } },
        availableProducts: [
          { id: 'p1', name: 'Kopi Arabika Gayo', price: 35000, stock: 15, description: 'Single origin' },
        ],
      },
      windowedHistory: [],
    };

    // Fast-path for address
    const addressResp = await router.routeAndExecute(context, 'Dimana alamat lokasi toko?');
    expect(addressResp.agentUsed).toBe(AgentType.FAQ);
    expect(addressResp.tokensUsed).toBe(0);
    expect(addressResp.message).toContain('Jl. Merdeka No. 45');

    // Fast-path for specific product
    const productResp = await router.routeAndExecute(context, 'Berapa harga Kopi Arabika Gayo?');
    expect(productResp.agentUsed).toBe(AgentType.PRODUCT);
    expect(productResp.tokensUsed).toBe(0);
    expect(productResp.message).toContain('35.000');
  });
});
