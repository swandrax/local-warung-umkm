import { describe, it, expect } from 'bun:test';
import { PriorityTaskQueue, TaskPriority, BackpressureError } from './infrastructure/queue/priority-queue';
import { WorkerPool } from './infrastructure/queue/worker-pool';

describe('Stage 3: Queue, Shared Worker Pool & Backpressure Management', () => {
  it('1. Priority Ordering: HIGH priority tasks are dequeued before LOW priority tasks', async () => {
    const queue = new PriorityTaskQueue(50, 25);
    const executionOrder: string[] = [];

    // Enqueue in reverse order: Low first, then Normal, then High
    queue.enqueue('tenant_1', TaskPriority.LOW, async () => { executionOrder.push('LOW'); });
    queue.enqueue('tenant_1', TaskPriority.NORMAL, async () => { executionOrder.push('NORMAL'); });
    queue.enqueue('tenant_1', TaskPriority.HIGH, async () => { executionOrder.push('HIGH'); });

    // Verify dequeue order
    const t1 = queue.dequeue();
    const t2 = queue.dequeue();
    const t3 = queue.dequeue();

    expect(t1?.priority).toBe(TaskPriority.HIGH);
    expect(t2?.priority).toBe(TaskPriority.NORMAL);
    expect(t3?.priority).toBe(TaskPriority.LOW);
  });

  it('2. Backpressure Load Shedding: Rejects excess requests when queue exceeds max capacity', async () => {
    const smallQueue = new PriorityTaskQueue(5, 3); // Max capacity 5

    // Fill queue to capacity (5 items)
    for (let i = 0; i < 5; i++) {
      smallQueue.enqueue('tenant_test', TaskPriority.NORMAL, async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
    }

    expect(smallQueue.isBackpressureActive()).toBe(true);

    // 6th item should immediately throw BackpressureError
    let threwBackpressure = false;
    try {
      await smallQueue.enqueue('tenant_test', TaskPriority.HIGH, async () => 'should not run');
    } catch (err) {
      if (err instanceof BackpressureError) {
        threwBackpressure = true;
      }
    }

    expect(threwBackpressure).toBe(true);
  });

  it('3. Shared Worker Pool: Limits concurrency to configured pool size', async () => {
    const testQueue = new PriorityTaskQueue(20, 10);
    const workerPool = new WorkerPool(testQueue, { concurrency: 3 });

    let runningTasks = 0;
    let maxObservedConcurrency = 0;

    const taskPromises = Array.from({ length: 9 }).map((_, i) =>
      testQueue.enqueue('tenant_concurrency', TaskPriority.HIGH, async () => {
        runningTasks++;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, runningTasks);
        await new Promise((r) => setTimeout(r, 40));
        runningTasks--;
        return `done_${i}`;
      })
    );

    const results = await Promise.all(taskPromises);
    expect(results.length).toBe(9);
    // Concurrency must never exceed 3
    expect(maxObservedConcurrency).toBeLessThanOrEqual(3);
    workerPool.stop();
  });

  it('4. Staged Load Simulation: Benchmarks throughput, p95 latency & backpressure rejection rate', async () => {
    const queue = new PriorityTaskQueue(30, 15);
    const pool = new WorkerPool(queue, { concurrency: 5 });

    const runBatch = async (concurrency: number) => {
      const latencies: number[] = [];
      let rejectedCount = 0;
      let acceptedCount = 0;

      const tasks = Array.from({ length: concurrency }).map(async (_, idx) => {
        const start = performance.now();
        try {
          await queue.enqueue(`tenant_${idx % 5}`, TaskPriority.HIGH, async () => {
            // Simulated fast-path / slow-path latency (10-30ms)
            await new Promise((r) => setTimeout(r, 15 + Math.random() * 15));
            return true;
          });
          latencies.push(performance.now() - start);
          acceptedCount++;
        } catch (err: any) {
          if (err instanceof BackpressureError) {
            rejectedCount++;
          }
        }
      });

      await Promise.all(tasks);
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

      return { concurrency, acceptedCount, rejectedCount, p50: Math.round(p50), p95: Math.round(p95) };
    };

    // Test staged concurrency levels
    const report10 = await runBatch(10);
    expect(report10.acceptedCount).toBe(10);
    expect(report10.rejectedCount).toBe(0);

    const report50 = await runBatch(50);
    // When 50 items hit a queue with max capacity 30, backpressure activates safely!
    expect(report50.rejectedCount).toBeGreaterThan(0);
    expect(report50.acceptedCount).toBeGreaterThan(0);

    console.log('[Load Simulation Report]', {
      ccu10: report10,
      ccu50: report50,
    });

    pool.stop();
  });
});
