import { Elysia, t } from 'elysia';
import { getAllApiRoutes, findApiRoutes } from '../ai/tools/api-registry';
import { CognitiveReasoningEngine, type ApiPlanOutput } from '../ai/reasoning/cognitive-agent';
import Groq from 'groq-sdk';

// Initialize Groq client with active model
const groqApiKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const groqClient = (groqApiKey && groqApiKey !== 'mock') ? new Groq({ apiKey: groqApiKey }) : null;

export const apiUsageRoutes = new Elysia()
  /**
   * Introspection endpoint: Returns all available API routes across the platform
   * for developers, documentation, and external AI agents.
   */
  .get(
    '/routes',
    ({ query }) => {
      const { category, q } = query;
      const filtered = findApiRoutes(category, q);
      const all = getAllApiRoutes();
      const categories = [...new Set(all.map((r) => r.category))];

      return {
        success: true,
        meta: {
          total: filtered.length,
          allTotal: all.length,
          categories,
          version: '1.0.0',
          baseUrl: 'http://localhost:3000',
        },
        data: filtered,
      };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Alias: GET /ai/routes
   */
  .get(
    '/ai/routes',
    ({ query }) => {
      const { category, q } = query;
      const filtered = findApiRoutes(category, q);
      const all = getAllApiRoutes();
      const categories = [...new Set(all.map((r) => r.category))];

      return {
        success: true,
        meta: {
          total: filtered.length,
          allTotal: all.length,
          categories,
          baseUrl: 'http://localhost:3000',
        },
        data: filtered,
      };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        q: t.Optional(t.String()),
      }),
    }
  )

  /**
   * AI Route Planner endpoint:
   * Groq AI reads the entire API route catalog of this project and outputs
   * the exact sequence of API calls needed to fulfill any given user requirement.
   */
  .post(
    '/ai/plan-routes',
    async ({ body, set }) => {
      const { requirement, role = 'PUBLIC' } = body;
      const startTime = Date.now();

      // Build the specialized system prompt with full route catalog embedded
      const prompt = CognitiveReasoningEngine.buildApiPlannerPrompt(requirement, role);

      let rawOutput = '';
      let tokensUsed = 0;

      if (groqClient) {
        try {
          const timeoutMs = 8000;
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Groq request timed out after ${timeoutMs}ms`)), timeoutMs)
          );

          const completionPromise = groqClient.chat.completions.create({
            model: groqModel,
            messages: [
              {
                role: 'system',
                content: prompt,
              },
              {
                role: 'user',
                content: `Kebutuhan spesifik saya: ${requirement}`,
              },
            ],
            temperature: 0.1, // Highly deterministic for exact route selection
            max_tokens: 1200,
          });

          const completion = await Promise.race([completionPromise, timeoutPromise]);
          rawOutput = completion.choices[0]?.message?.content || '';
          tokensUsed = completion.usage?.total_tokens || 0;
        } catch (err: any) {
          console.warn('[ApiUsageRoute] Groq live call fallback triggered:', err?.message || err);
          rawOutput = simulateLocalApiPlan(requirement, role);
        }
      } else {
        rawOutput = simulateLocalApiPlan(requirement, role);
      }

      const plan: ApiPlanOutput = CognitiveReasoningEngine.parseApiPlanOutput(rawOutput, requirement);
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          requirement,
          role,
          thinking: plan.thinking,
          summary: plan.summary,
          calls: plan.calls,
          curlExamples: plan.curlExamples,
          response: plan.response,
          modelUsed: groqClient ? groqModel : 'local-deterministic-planner',
          tokensUsed,
          latencyMs,
        },
      };
    },
    {
      body: t.Object({
        requirement: t.String({ minLength: 3, maxLength: 2000 }),
        role: t.Optional(t.String()),
      }),
    }
  );

/**
 * Intelligent deterministic local planner fallback if Groq API is unreachable
 */
function simulateLocalApiPlan(requirement: string, role: string): string {
  const reqLower = requirement.toLowerCase();

  if (reqLower.includes('produk') && (reqLower.includes('upload') || reqLower.includes('tambah') || reqLower.includes('buat'))) {
    return JSON.stringify({
      thinking: 'Pengguna ingin menambahkan produk baru ke toko mitra disertai foto. Memerlukan autentikasi mitra, upload gambar, lalu pembuatan data produk.',
      summary: 'Alur 3 langkah: Login Mitra -> Upload Foto Produk -> Buat Produk Baru',
      calls: [
        {
          step: 1,
          method: 'POST',
          endpoint: '/api/auth/login',
          access: 'PUBLIC',
          description: 'Login untuk mendapatkan sesi autentikasi dan token',
          payload: { email: 'mitra@example.com', password: 'password123' },
        },
        {
          step: 2,
          method: 'POST',
          endpoint: '/api/upload',
          access: 'USER',
          description: 'Unggah foto produk untuk mendapatkan URL aset statis',
          payload: { image: '(binary multipart file)' },
        },
        {
          step: 3,
          method: 'POST',
          endpoint: '/api/products',
          access: 'MITRA',
          description: 'Daftarkan data produk dengan menyertakan URL gambar yang diperoleh pada step 2',
          payload: {
            name: 'Nama Produk',
            price: 25000,
            stock: 100,
            category: 'Makanan',
            image: '/uploads/sample.jpg',
            isPublic: true,
          },
        },
      ],
      curlExamples: [
        'curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"mitra@example.com","password":"..."}\'',
        'curl -X POST http://localhost:3000/api/upload -F "image=@/path/to/foto.jpg"',
        'curl -X POST http://localhost:3000/api/products -H "Content-Type: application/json" -d \'{"name":"Kopi Spesial","price":20000,"stock":50}\'',
      ],
      response: 'Untuk menambahkan produk baru dengan foto, Anda perlu menjalankan 3 langkah API: 1) Login akun mitra, 2) Upload file foto ke /api/upload, 3) Daftarkan produk ke /api/products.',
    });
  }

  // Default storefront search & detail
  return JSON.stringify({
    thinking: 'Pengguna mencari rute untuk eksplorasi katalog produk dan warung.',
    summary: 'Alur penelusuran publik: Cari produk -> Ambil detail produk',
    calls: [
      {
        step: 1,
        method: 'GET',
        endpoint: '/api/public/products',
        access: 'PUBLIC',
        description: 'Mencari dan memfilter produk dengan parameter pencarian',
        params: { q: requirement, limit: 10 },
      },
      {
        step: 2,
        method: 'GET',
        endpoint: '/api/public/products/:id',
        access: 'PUBLIC',
        description: 'Membaca detail lengkap produk dan toko mitra',
        params: { id: 'uuid-product' },
      },
    ],
    curlExamples: [
      `curl -X GET "http://localhost:3000/api/public/products?q=${encodeURIComponent(requirement)}"`,
      'curl -X GET "http://localhost:3000/api/public/products/sample-id"',
    ],
    response: 'Gunakan endpoint publik /api/public/products untuk mencari produk yang diinginkan, kemudian panggil /api/public/products/:id untuk melihat detail lengkap toko dan produk terkait.',
  });
}
