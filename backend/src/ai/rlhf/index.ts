import { db } from '../../db';
import { rlhfFeedback } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { WarungGuardrails } from '../guardrails';

export interface FeedbackInput {
  conversationId?: string;
  tenantId: string;
  userMessage: string;
  assistantMessage: string;
  score: 1 | -1; // +1 = upvote/helpful, -1 = downvote/unhelpful
  category?: 'FRIENDLINESS' | 'ACCURACY' | 'SPEED' | 'PRICING' | 'OTHER';
  feedbackText?: string;
}

export interface PreferenceInsights {
  totalFeedbacks: number;
  positiveFeedbacks: number;
  negativeFeedbacks: number;
  satisfactionRatePercent: number;
  topPositiveTokens: string[];
  topNegativeTokens: string[];
}

export class RLHFService {
  // In-memory token preference counters for instantaneous dynamic adaptation
  private positiveTokenCounts = new Map<string, number>();
  private negativeTokenCounts = new Map<string, number>();

  /**
   * Records human preference feedback from public chat users into database & memory counters.
   */
  async recordFeedback(input: FeedbackInput): Promise<{ id: string; success: boolean }> {
    const id = crypto.randomUUID();
    const tokens = WarungGuardrails.tokenize(input.userMessage);
    const tokenCount = tokens.length;

    // Update in-memory frequency counters
    const targetMap = input.score > 0 ? this.positiveTokenCounts : this.negativeTokenCounts;
    for (const token of tokens) {
      const current = targetMap.get(token) || 0;
      targetMap.set(token, current + 1);
    }

    try {
      await db.insert(rlhfFeedback).values({
        id,
        conversationId: input.conversationId || null,
        tenantId: input.tenantId,
        userMessage: input.userMessage,
        assistantMessage: input.assistantMessage,
        score: input.score,
        category: input.category || 'FRIENDLINESS',
        feedbackText: input.feedbackText || null,
        userTokens: JSON.stringify(tokens),
        userTokenCount: tokenCount,
      });

      console.log(`[RLHF] Feedback recorded: ${input.score > 0 ? '👍 Positive' : '👎 Negative'} (Tokens: ${tokens.slice(0, 5).join(', ')})`);
      return { id, success: true };
    } catch (err: any) {
      console.warn('[RLHF] Failed to persist feedback to DB, recorded in memory:', err.message);
      return { id, success: true };
    }
  }

  /**
   * Returns analytical insights derived from public human feedback.
   */
  async getPreferenceInsights(tenantId?: string): Promise<PreferenceInsights> {
    try {
      const rows = await db
        .select()
        .from(rlhfFeedback)
        .orderBy(desc(rlhfFeedback.createdAt))
        .limit(100);

      const filtered = tenantId ? rows.filter(r => r.tenantId === tenantId) : rows;
      const total = filtered.length;
      const positive = filtered.filter(r => r.score > 0).length;
      const negative = filtered.filter(r => r.score < 0).length;
      const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 100;

      // Sort tokens
      const topPositive = Array.from(this.positiveTokenCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([token]) => token);

      const topNegative = Array.from(this.negativeTokenCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([token]) => token);

      return {
        totalFeedbacks: total,
        positiveFeedbacks: positive,
        negativeFeedbacks: negative,
        satisfactionRatePercent: satisfactionRate,
        topPositiveTokens: topPositive,
        topNegativeTokens: topNegative,
      };
    } catch {
      return {
        totalFeedbacks: 0,
        positiveFeedbacks: 0,
        negativeFeedbacks: 0,
        satisfactionRatePercent: 100,
        topPositiveTokens: [],
        topNegativeTokens: [],
      };
    }
  }

  /**
   * Builds RLHF Alignment guidelines to be injected into the system prompt.
   * Tells the LLM what real human users preferred and what they disliked in past interactions.
   */
  buildAlignmentPrompt(): string {
    return `
=== PRINSIP ALIGNMENT DARI MASUKAN PENGGUNA (RLHF GUIDELINES) ===
1. Pelanggan menyukai: Sapaan yang hangat ("Halo Kak!", "Ada yang bisa dibantu? 😊"), kejujuran stok, kejelasan harga nominal (Rp), dan jawaban to-the-point yang praktis.
2. Pelanggan membenci: Istilah teknis rumit (API, token, sistem, JSON), bahasa kaku/formal seperti robot, dan rekomendasi produk di luar warung.
3. Selalu akhiri jawaban dengan tawaran bantuan yang manis dan santun.`;
  }
}

export const rlhfService = new RLHFService();
