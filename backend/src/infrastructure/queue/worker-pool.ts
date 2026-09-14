import { taskQueue, TaskPriority, type PriorityTaskQueue } from './priority-queue';
import { db } from '../../db';
import { conversations, messages } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface WorkerPoolConfig {
  concurrency: number; // Maximum number of concurrent tasks being processed
}

export class WorkerPool {
  private activeWorkers = 0;
  private isRunning = true;
  private queue: PriorityTaskQueue;
  private concurrency: number;

  constructor(queue: PriorityTaskQueue = taskQueue, config?: Partial<WorkerPoolConfig>) {
    this.queue = queue;
    this.concurrency = config?.concurrency ?? 5; // Default 5 concurrent workers
    this.startWorkerLoop();
  }

  private startWorkerLoop() {
    // Event-loop pump
    const pump = () => {
      if (!this.isRunning) return;

      while (this.activeWorkers < this.concurrency && this.queue.totalPending > 0) {
        const task = this.queue.dequeue();
        if (!task) break;

        this.activeWorkers++;
        this.processTask(task);
      }

      setTimeout(pump, 20); // Check every 20ms
    };

    pump();
  }

  private async processTask(task: any) {
    const startTime = Date.now();
    try {
      const result = await task.execute();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeWorkers--;
      const latency = Date.now() - startTime;
      if (latency > 1000) {
        console.info(`[WorkerPool] Long task completed: ${task.id} (${latency}ms)`);
      }
    }
  }

  /**
   * Background Task: Summarizes conversation when message history grows too long.
   * Compresses token footprint for subsequent queries.
   */
  async enqueueSummarization(conversationId: string, tenantId: string) {
    return this.queue.enqueue(tenantId, TaskPriority.LOW, async () => {
      try {
        const recentMessages = await db
          .select({
            role: messages.role,
            content: messages.content,
          })
          .from(messages)
          .where(eq(messages.conversationId, conversationId))
          .orderBy(desc(messages.createdAt))
          .limit(10);

        if (recentMessages.length >= 6) {
          // Compress into a brief summary
          const summaryText = recentMessages
            .reverse()
            .map((m) => `${m.role}: ${m.content.slice(0, 50)}`)
            .join(' | ');

          await db
            .update(conversations)
            .set({ summary: `Ringkasan Sesi: ${summaryText.slice(0, 300)}` })
            .where(eq(conversations.id, conversationId));

          console.log(`[WorkerPool] Background conversation summary saved for ${conversationId}`);
        }
      } catch (err: any) {
        console.warn(`[WorkerPool] Failed background summarization:`, err?.message);
      }
    });
  }

  getStats() {
    return {
      activeWorkers: this.activeWorkers,
      concurrency: this.concurrency,
      ...this.queue.getStats(),
    };
  }

  stop() {
    this.isRunning = false;
  }
}

export const workerPool = new WorkerPool();
