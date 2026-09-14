import type { AIContext, AIProvider, AIResponse, Tool } from './index';

export class VLLMProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(
    baseUrl = process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
    model = process.env.VLLM_MODEL || 'meta-llama/Llama-4-Scout-17B-16E',
    apiKey = process.env.VLLM_API_KEY || 'EMPTY'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.apiKey = apiKey;
    console.log(`[VLLMProvider] Initialized targeting ${this.baseUrl} with model: ${this.model}`);
  }

  async generate(context: AIContext, userPrompt: string, tools?: Tool[]): Promise<AIResponse> {
    const { CognitiveReasoningEngine } = require('../reasoning/cognitive-agent');
    const systemPrompt = CognitiveReasoningEngine.buildCognitivePrompt(context);

    // Build user content (supports multimodal vision if imageUrl is provided)
    let userContent: any = userPrompt;
    if (context.imageUrl) {
      userContent = [
        { type: 'text', text: userPrompt },
        {
          type: 'image_url',
          image_url: {
            url: context.imageUrl,
          },
        },
      ];
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.windowedHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: userContent },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`vLLM server error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Maaf, tidak ada respons dari model vLLM.';
      const tokensUsed = data.usage?.total_tokens || 0;

      const cognitive = CognitiveReasoningEngine.parseCognitiveOutput(reply);

      return {
        message: cognitive.response,
        thinking: cognitive.thinking,
        action: cognitive.action,
        tokensUsed,
      };
    } catch (err: any) {
      console.warn(`[VLLMProvider] Failed connecting to vLLM server: ${err?.message}`);
      throw err;
    }
  }

  async *stream(context: AIContext, prompt: string, tools?: Tool[]): AsyncGenerator<string, void, unknown> {
    const { CognitiveReasoningEngine } = require('../reasoning/cognitive-agent');
    const systemPrompt = CognitiveReasoningEngine.buildCognitivePrompt(context);

    let userContent: any = prompt;
    if (context.imageUrl) {
      userContent = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: context.imageUrl } },
      ];
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.windowedHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: userContent },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    if (!response.ok || !response.body) {
      yield 'Gagal terhubung dengan server vLLM lokal.';
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // ignore chunk parse errors
          }
        }
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
