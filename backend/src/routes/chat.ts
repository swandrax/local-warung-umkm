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

      // 2. Fetch Tenant Business Context (Valkey Cache-first)
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

      // 3. Retrieve conversation history for context windowing (last 6 messages)
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
          // Create new conversation in DB
          await db.insert(conversations).values({
            id: conversationId,
            tenantId,
            status: 'ACTIVE',
          }).catch(() => {});
        }
      } catch (err) {
        console.warn('[ChatRoute] DB conversation fetch fallback:', err);
      }

      // 4. Save user message to DB asynchronously
      db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content: message,
      }).catch(() => {});

      // 5. Execute via Priority Queue Worker Pool (with Backpressure Protection)
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

      const latencyMs = Date.now() - startTime;

      // 6. Save assistant response & log telemetry
      db.insert(messages).values({
        id: crypto.randomUUID(),
        conversationId,
        role: 'assistant',
        content: result.message,
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

      // 7. Trigger background summarization in low-priority worker queue
      workerPool.enqueueSummarization(conversationId, tenantId).catch(() => {});

      return {
        success: true,
        data: {
          conversationId,
          message: result.message,
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
  );
