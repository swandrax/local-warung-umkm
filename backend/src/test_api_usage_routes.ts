import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { apiUsageRoutes } from './routes/api-usage';
import { getAllApiRoutes, findApiRoutes } from './ai/tools/api-registry';
import { CognitiveReasoningEngine } from './ai/reasoning/cognitive-agent';

describe('API Usage & Route Introspection with Groq AI', () => {
  const app = new Elysia().group('/api', (app) => app.use(apiUsageRoutes));

  it('1. API Route Registry: Contains comprehensive endpoints for all project modules', () => {
    const all = getAllApiRoutes();
    expect(all.length).toBeGreaterThanOrEqual(15);

    const categories = new Set(all.map((r) => r.category));
    expect(categories.has('AUTH')).toBe(true);
    expect(categories.has('PRODUCTS')).toBe(true);
    expect(categories.has('MITRA')).toBe(true);
    expect(categories.has('PUBLIC')).toBe(true);
    expect(categories.has('CHAT_AI')).toBe(true);
  });

  it('2. Filter & Search: Can filter routes by category and search keyword', () => {
    const productRoutes = findApiRoutes('PRODUCTS');
    expect(productRoutes.length).toBeGreaterThan(0);
    expect(productRoutes.every((r) => r.category === 'PRODUCTS')).toBe(true);

    const searchResults = findApiRoutes(undefined, 'kemitraan');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((r) => r.path.includes('/partnerships'))).toBe(true);
  });

  it('3. GET /api/routes: Introspection endpoint returns all available endpoints and metadata', async () => {
    const res = await app.handle(new Request('http://localhost/api/routes'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.total).toBeGreaterThanOrEqual(15);
    expect(Array.isArray(body.data)).toBe(true);

    const publicProductRoute = body.data.find((r: any) => r.path === '/api/public/products');
    expect(publicProductRoute).toBeDefined();
    expect(publicProductRoute.method).toBe('GET');
  });

  it('4. GET /api/routes with query params: filters dynamically', async () => {
    const res = await app.handle(new Request('http://localhost/api/routes?category=AUTH'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.every((r: any) => r.category === 'AUTH')).toBe(true);
    expect(body.data.some((r: any) => r.path === '/api/auth/login')).toBe(true);
  });

  it('5. CognitiveReasoningEngine: Includes API routes in prompt and supports API_CALL action', () => {
    const prompt = CognitiveReasoningEngine.buildCognitivePrompt({
      tenantId: 'tenant-test',
      conversationId: 'conv-test',
      windowedHistory: [],
    });

    expect(prompt).toContain('KATALOG API ROUTES RESMI PROYEK INI');
    expect(prompt).toContain('/api/public/products');
    expect(prompt).toContain('API_CALL');
    expect(prompt).toContain('API_WORKFLOW');

    const rawJsonOutput = JSON.stringify({
      thinking: 'Pengguna menanyakan rute untuk mengambil produk.',
      action: {
        type: 'API_CALL',
        payload: {
          method: 'GET',
          endpoint: '/api/public/products',
          params: { category: 'Minuman' },
        },
      },
      response: 'Gunakan GET /api/public/products?category=Minuman untuk mengambil produk.',
    });

    const parsed = CognitiveReasoningEngine.parseCognitiveOutput(rawJsonOutput);
    expect(parsed.action.type).toBe('API_CALL');
    expect((parsed.action.payload as any).endpoint).toBe('/api/public/products');
  });

  it('6. POST /api/ai/plan-routes: AI outputs structured route API calls for user requirement', async () => {
    const req = new Request('http://localhost/api/ai/plan-routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: 'Saya ingin mendaftarkan warung baru dan menambahkan produk kopi pertama saya',
        role: 'MITRA',
      }),
    });

    const res = await app.handle(req);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.calls).toBeDefined();
    expect(Array.isArray(body.data.calls)).toBe(true);
    expect(body.data.calls.length).toBeGreaterThanOrEqual(1);

    const firstStep = body.data.calls[0];
    expect(firstStep.step).toBe(1);
    expect(firstStep.method).toBeDefined();
    expect(firstStep.endpoint).toBeDefined();

    console.log('[Test Route Planner Output]', {
      model: body.data.modelUsed,
      summary: body.data.summary,
      stepsCount: body.data.calls.length,
      calls: body.data.calls.map((c: any) => `[${c.method}] ${c.endpoint} -> ${c.description}`),
    });
  }, 20000);
});
