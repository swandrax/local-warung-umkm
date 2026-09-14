import { Elysia, t } from 'elysia';
import { db } from '../db';
import { conversations, messages, agentLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { rateLimiter } from '../infrastructure/rate-limit/token-bucket';
import { taskQueue, TaskPriority, BackpressureError } from '../infrastructure/queue/priority-queue';
import { workerPool } from '../infrastructure/queue/worker-pool';
import { tenantContextService } from '../ai/context/tenant-context';
import { AgentRouter } from '../ai/router';
import { createAIProvider, type Message } from '../ai/providers';
import { WarungGuardrails } from '../ai/guardrails';
import { rlhfService } from '../ai/rlhf';

// Singleton router initialized with active AI Provider (Groq or vLLM)
const activeProvider = createAIProvider();
const agentRouter = new AgentRouter(activeProvider);

export const chatRoutes = new Elysia({ prefix: '/chat' })
  .post(
    '/',
    async ({ body, set, headers }) => {
      const { tenantId, message, conversationId: existingConvId, imageUrl } = body;
      const clientIp = headers['x-forwarded-for'] || '127.0.0.1';

      // 1. Rate Limiting Check (Token Bucket per tenant and per IP)
      const ipLimit = await rateLimiter.checkIp(clientIp);
      if (!ipLimit.allowed) {
        set.status = 429;
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Batas pesan per menit terlampaui. Silakan tunggu ${ipLimit.retryAfterSeconds} detik.`,
            retryAfter: ipLimit.retryAfterSeconds,
          },
        };
      }

      const tenantLimit = await rateLimiter.checkTenant(tenantId);
      if (!tenantLimit.allowed) {
        set.status = 429;
        return {
          success: false,
          error: {
            code: 'TENANT_CAPACITY_EXCEEDED',
            message: `Layanan chat toko sedang melayani antrean tinggi. Silakan coba lagi dalam ${tenantLimit.retryAfterSeconds} detik.`,
            retryAfter: tenantLimit.retryAfterSeconds,
          },
        };
      }

      // 2. Input Guardrail: Content Safety, Toxicity & Prompt Injection Protection
      const guardrailResult = WarungGuardrails.evaluateInput(message);
      if (!guardrailResult.passed) {
        return {
          success: true,
          data: {
            conversationId: existingConvId || crypto.randomUUID(),
            message: guardrailResult.friendlyFallback,
            thinking: `Guardrail mengalihkan percakapan secara santun karena mendeteksi: ${guardrailResult.reason}`,
            action: { type: 'REPLY_INFO' },
            agentUsed: 'GUARDRAILS_SAFETY',
            tokensUsed: 0,
            latencyMs: 2,
          },
        };
      }

      // 3. Fetch Tenant Business Context (Redis Cache-first)
      const tenantInfo = await tenantContextService.getOrFetchTenantContext(tenantId);
      if (!tenantInfo) {
        set.status = 404;
        return {
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Toko atau bisnis lokal tidak ditemukan.',
          },
        };
      }

      const conversationId = existingConvId || crypto.randomUUID();
      const requestId = crypto.randomUUID();
      const startTime = Date.now();

      // 4. Retrieve conversation history for context windowing (last 6 messages)
      let windowedHistory: Message[] = [];
      try {
        if (existingConvId) {
          const historyRows = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, existingConvId))
            .orderBy(desc(messages.createdAt))
            .limit(6);

          windowedHistory = historyRows.reverse().map((r) => ({
            role: r.role as 'system' | 'user' | 'assistant',
            content: r.content,
          }));
        } else {
          await db.insert(conversations).values({
            id: conversationId,
            tenantId,
            status: 'ACTIVE',
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[ChatRoute] DB conversation fetch fallback:', err);
      }

      // 5. Save user message to DB asynchronously
      db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content: message,
      }).catch(() => {});

      // 6. Execute via Priority Queue Worker Pool (with Backpressure Protection)
      const aiContext = {
        tenantId,
        conversationId,
        tenantInfo,
        windowedHistory,
        imageUrl,
      };

      let result;
      try {
        result = await taskQueue.enqueue(tenantId, TaskPriority.HIGH, async () => {
          return await agentRouter.routeAndExecute(aiContext, message);
        });
      } catch (err: any) {
        if (err instanceof BackpressureError || err.name === 'BackpressureError') {
          set.status = 503;
          return {
            success: false,
            error: {
              code: 'SYSTEM_OVERLOAD_BACKPRESSURE',
              message: err.message,
            },
          };
        }
        throw err;
      }

      // 7. Output Guardrail: Check for system leaks and polish tone
      const outputCheck = WarungGuardrails.evaluateOutput(result.message);
      const finalMessage = outputCheck.polishedText;
      const latencyMs = Date.now() - startTime;

      // 8. Save assistant response & log telemetry
      db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: 'assistant',
        content: finalMessage,
        tokensUsed: result.tokensUsed || 0,
      }).catch(() => {});

      db.insert(agentLogs).values({
        id: crypto.randomUUID(),
        tenantId,
        requestId,
        agentType: result.agentUsed,
        latencyMs,
        status: 'SUCCESS',
      }).catch(() => {});

      // 9. Trigger background summarization in low-priority worker queue
      workerPool.enqueueSummarization(conversationId, tenantId).catch(() => {});

      return {
        success: true,
        data: {
          conversationId,
          message: finalMessage,
          thinking: result.thinking,
          action: result.action,
          agentUsed: result.agentUsed,
          tokensUsed: result.tokensUsed,
          latencyMs,
        },
      };
    },
    {
      body: t.Object({
        tenantId: t.String({ minLength: 1 }),
        message: t.String({ minLength: 1, maxLength: 1000 }),
        conversationId: t.Optional(t.String()),
        imageUrl: t.Optional(t.String()),
      }),
    }
  )
  // RLHF Feedback Endpoint: Users rate answers (👍 / 👎) to teach the model public preferences
  .post(
    '/feedback',
    async ({ body }) => {
      const { conversationId, tenantId, userMessage, assistantMessage, score, category, feedbackText } = body;

      const res = await rlhfService.recordFeedback({
        conversationId,
        tenantId,
        userMessage,
        assistantMessage,
        score: score > 0 ? 1 : -1,
        category: category as any,
        feedbackText,
      });

      return {
        success: true,
        data: {
          id: res.id,
          message: score > 0 
            ? 'Terima kasih banyak atas dukungannya, Kak! Senang bisa membantu 😊🙏' 
            : 'Terima kasih atas masukannya, Kak. Ini akan membantu kami melayani lebih ramah dan tepat lagi ke depannya 🙏',
        },
      };
    },
    {
      body: t.Object({
        conversationId: t.Optional(t.String()),
        tenantId: t.String({ minLength: 1 }),
        userMessage: t.String({ minLength: 1 }),
        assistantMessage: t.String({ minLength: 1 }),
        score: t.Numeric(),
        category: t.Optional(t.String()),
        feedbackText: t.Optional(t.String()),
      }),
    }
  )
  // RLHF Insights: Public preference and satisfaction metrics
  .get(
    '/feedback/insights',
    async ({ query }) => {
      const insights = await rlhfService.getPreferenceInsights(query?.tenantId);
      return {
        success: true,
        data: insights,
      };
    },
    {
      query: t.Optional(t.Object({
        tenantId: t.Optional(t.String()),
      })),
    }
  );

