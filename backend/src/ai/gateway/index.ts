import type { AIContext, AIProvider, AIResponse, Tool } from '../providers';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // consecutive failures to open circuit
  cooldownPeriodMs: number; // time to wait in OPEN before trying HALF_OPEN
  timeoutMs: number;        // maximum timeout per upstream call
  maxRetries: number;       // retries before giving up
}

export class AIGateway {
  private provider: AIProvider;
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private lastStateChangedAt = Date.now();
  private config: CircuitBreakerConfig;

  constructor(provider: AIProvider, config?: Partial<CircuitBreakerConfig>) {
    this.provider = provider;
    this.config = {
      failureThreshold: 5,
      cooldownPeriodMs: 20000, // 20s
      timeoutMs: 10000,        // 10s
      maxRetries: 2,
      ...config,
    };
  }

  getCircuitState(): CircuitState {
    const now = Date.now();
    if (this.state === CircuitState.OPEN && now - this.lastStateChangedAt > this.config.cooldownPeriodMs) {
      this.state = CircuitState.HALF_OPEN;
      this.lastStateChangedAt = now;
      console.warn('[AIGateway] Circuit transitioned from OPEN to HALF_OPEN (probing upstream)...');
    }
    return this.state;
  }

  private recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      console.log('[AIGateway] Upstream recovered. Circuit CLOSED.');
      this.state = CircuitState.CLOSED;
      this.lastStateChangedAt = Date.now();
    }
  }

  private recordFailure(error: any) {
    this.consecutiveFailures += 1;
    console.error(`[AIGateway] Call failure (${this.consecutiveFailures}/${this.config.failureThreshold}):`, error?.message || error);
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChangedAt = Date.now();
      console.error('[AIGateway] Circuit breaker tripped! State is now OPEN.');
    }
  }

  /**
   * Protected execution with circuit breaker, timeout, retry with exponential backoff.
   */
  async execute(context: AIContext, prompt: string, tools?: Tool[]): Promise<AIResponse> {
    const currentState = this.getCircuitState();
    const startTime = Date.now();

    if (currentState === CircuitState.OPEN) {
      const waitRemaining = Math.ceil((this.config.cooldownPeriodMs - (Date.now() - this.lastStateChangedAt)) / 1000);
      return {
        message: 'Layanan asisten AI sedang dalam pemeliharaan otomatis atau beban tinggi. Silakan coba lagi beberapa saat lagi.',
        tokensUsed: 0,
      };
    }

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= this.config.maxRetries) {
      try {
        // Enforce timeout using Promise.race
        const executionPromise = this.provider.generate(context, prompt, tools);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Upstream request timeout after ${this.config.timeoutMs}ms`)), this.config.timeoutMs)
        );

        const result = await Promise.race([executionPromise, timeoutPromise]);
        this.recordSuccess();

        const latencyMs = Date.now() - startTime;
        console.log(JSON.stringify({
          level: 'INFO',
          service: 'AIGateway',
          tenantId: context.tenantId,
          conversationId: context.conversationId,
          latencyMs,
          tokens: result.tokensUsed ?? 0,
          status: 'SUCCESS',
        }));

        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt <= this.config.maxRetries) {
          // Exponential backoff with jitter: (2^attempt * 200ms) + random(0-100ms)
          const backoff = Math.pow(2, attempt) * 200 + Math.floor(Math.random() * 100);
          console.warn(`[AIGateway] Retrying request in ${backoff}ms (Attempt ${attempt}/${this.config.maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    this.recordFailure(lastError);
    const latencyMs = Date.now() - startTime;

    console.error(JSON.stringify({
      level: 'ERROR',
      service: 'AIGateway',
      tenantId: context.tenantId,
      conversationId: context.conversationId,
      latencyMs,
      error: lastError?.message || String(lastError),
      status: 'CIRCUIT_TRIPPED_OR_FAILED',
    }));

    return {
      message: 'Maaf, sistem asisten AI sedang mengalami sedikit kendala koneksi. Pesan Anda telah tercatat.',
      tokensUsed: 0,
    };
  }
}
