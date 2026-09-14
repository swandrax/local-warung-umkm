export interface InputGuardrailResult {
  passed: boolean;
  sanitizedText: string;
  reason?: string;
  friendlyFallback?: string;
  tokens: string[];
}

export interface OutputGuardrailResult {
  approved: boolean;
  polishedText: string;
}

export class WarungGuardrails {
  private static toxicKeywords = [
    'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'tolol', 'goblok', 
    'bajingan', 'kampret', 'pelacur', 'lonte', 'ngentot', 'fuck', 'shit', 'asshole'
  ];

  private static injectionPatterns = [
    /ignore (all|any|previous) instructions/i,
    /abaikan (semua|seluruh) instruksi/i,
    /system prompt/i,
    /reveal prompt/i,
    /jailbreak/i,
    /dan mode/i,
    /kamu sekarang adalah/i,
    /you are now/i,
    /bypass security/i,
  ];

  /**
   * Tokenizes ordinary user input into meaningful lowercase word tokens for learning & preference analysis.
   */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s\d]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !['dan', 'yang', 'ini', 'itu', 'di', 'ke', 'dari', 'ya', 'kak', 'saja'].includes(t));
  }

  /**
   * Guardrail 1: Input Evaluation
   * Filters out toxicity, prompt injection, and harmful content while generating an extremely polite, warm redirection.
   */
  static evaluateInput(userText: string): InputGuardrailResult {
    const raw = userText.trim();
    const lower = raw.toLowerCase();
    const tokens = this.tokenize(raw);

    // 1. Prompt Injection Defense
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(lower)) {
        return {
          passed: false,
          sanitizedText: '[BLOCKED_INJECTION]',
          reason: 'PROMPT_INJECTION',
          friendlyFallback: 'Halo Kak! 😊 Mbak Sari di sini fokus melayani info seputar menu, produk warung, dan kemitraan UMKM ya. Ada produk atau pesanan yang bisa Mbak Sari bantu siapkan hari ini? 🙏',
          tokens,
        };
      }
    }

    // 2. Toxic / Abusive Language Defense
    for (const badWord of this.toxicKeywords) {
      // match word boundary
      const regex = new RegExp(`\\b${badWord}\\b`, 'i');
      if (regex.test(lower)) {
        return {
          passed: false,
          sanitizedText: '[BLOCKED_TOXIC]',
          reason: 'TOXIC_LANGUAGE',
          friendlyFallback: 'Aduh Kak, yuk kita bicara yang santun dan adem ya 😊🙏 Mbak Sari siap bantu dengan sepenuh hati untuk info belanja sembako, kopi seduh, atau kebutuhan warung lainnya. Mau dibantu apa hari ini, Kak?',
          tokens,
        };
      }
    }

    return {
      passed: true,
      sanitizedText: raw,
      tokens,
    };
  }

  /**
   * Guardrail 2: Output Evaluation
   * Ensures generated response does not leak internal schemas/prompts, maintains a warm tone, and does not make unauthorized guarantees.
   */
  static evaluateOutput(outputText: string): OutputGuardrailResult {
    let polished = outputText.trim();

    // Prevent system prompt leakage
    const leakKeywords = ['SYSTEM_PROMPT', 'CognitiveReasoningEngine', 'API_ROUTES', 'SELECT * FROM', 'table mitraProfiles'];
    for (const leak of leakKeywords) {
      if (polished.includes(leak)) {
        polished = 'Halo Kak! 😊 Semua produk warung kami terjamin kualitasnya dan siap disajikan. Mau pesan atau cek menu apa hari ini? 🙏';
        break;
      }
    }

    // Ensure polite greeting or warm tone if response is too curt
    if (polished.length < 15 && !polished.includes('😊') && !polished.includes('🙏') && !polished.includes('Kak')) {
      polished = `Halo Kak! ${polished} 😊🙏`;
    }

    return {
      approved: true,
      polishedText: polished,
    };
  }
}
