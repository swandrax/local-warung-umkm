export enum TaskPriority {
  HIGH = 1,    // Real-time active customer chat, critical responses
  NORMAL = 2,  // Standard inquiries
  LOW = 3,     // Asynchronous tasks, history summarization, analytics
}

export interface QueuedTask<T = any, R = any> {
  id: string;
  tenantId: string;
  priority: TaskPriority;
  execute: () => Promise<R>;
  resolve: (value: R) => void;
  reject: (reason: any) => void;
  createdAt: number;
}

export class BackpressureError extends Error {
  constructor(message = 'Sistem sedang dalam antrean beban puncak. Permintaan ditolak sementara untuk menjaga stabilitas sistem.') {
    super(message);
    this.name = 'BackpressureError';
  }
}

export class PriorityTaskQueue {
  private highQueue: QueuedTask[] = [];
  private normalQueue: QueuedTask[] = [];
  private lowQueue: QueuedTask[] = [];

  constructor(
    private maxCapacity = 200, // Maximum total queue depth
    private lowPriorityThreshold = 100 // Threshold to begin shedding low-priority tasks
  ) {}

  get totalPending(): number {
    return this.highQueue.length + this.normalQueue.length + this.lowQueue.length;
  }

  isBackpressureActive(): boolean {
    return this.totalPending >= this.maxCapacity;
  }

  /**
   * Enqueues a task with priority and backpressure enforcement.
   */
  async enqueue<R>(
    tenantId: string,
    priority: TaskPriority,
    taskFn: () => Promise<R>
  ): Promise<R> {
    // 1. Backpressure shedding for low-priority tasks when moderately loaded
    if (priority === TaskPriority.LOW && this.totalPending >= this.lowPriorityThreshold) {
      throw new BackpressureError('Antrean latar belakang ditunda sementara (Load Shedding: Low Priority).');
    }

    // 2. Hard backpressure limit: Reject all new requests when queue is saturated
    if (this.isBackpressureActive()) {
      console.warn(`[PriorityQueue] Backpressure tripped! Total pending: ${this.totalPending}/${this.maxCapacity}`);
      throw new BackpressureError();
    }

    return new Promise<R>((resolve, reject) => {
      const task: QueuedTask<any, R> = {
        id: crypto.randomUUID(),
        tenantId,
        priority,
        execute: taskFn,
        resolve,
        reject,
        createdAt: Date.now(),
      };

      if (priority === TaskPriority.HIGH) {
        this.highQueue.push(task);
      } else if (priority === TaskPriority.NORMAL) {
        this.normalQueue.push(task);
      } else {
        this.lowQueue.push(task);
      }
    });
  }

  /**
   * Dequeues the next highest priority task.
   */
  dequeue(): QueuedTask | undefined {
    if (this.highQueue.length > 0) return this.highQueue.shift();
    if (this.normalQueue.length > 0) return this.normalQueue.shift();
    if (this.lowQueue.length > 0) return this.lowQueue.shift();
    return undefined;
  }

  getStats() {
    return {
      highPending: this.highQueue.length,
      normalPending: this.normalQueue.length,
      lowPending: this.lowQueue.length,
      totalPending: this.totalPending,
      maxCapacity: this.maxCapacity,
      isBackpressureActive: this.isBackpressureActive(),
    };
  }
}

export const taskQueue = new PriorityTaskQueue();
