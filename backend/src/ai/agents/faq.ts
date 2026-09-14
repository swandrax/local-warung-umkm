import type { AIContext, AIResponse } from '../providers';
import type { AIGateway } from '../gateway';

export class FAQAgent {
  constructor(private gateway: AIGateway) {}

  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const q = message.toLowerCase();
    const info = context.tenantInfo;

    // Fast-Path: Deterministic check for opening hours & address without calling LLM (saves tokens and delivers <5ms latency!)
    if ((q.includes('jam buka') || q.includes('buka jam') || q.includes('jam operasional')) && info?.operatingHours) {
      return {
        message: `Jam operasional ${info.businessName}: ${JSON.stringify(info.operatingHours)}`,
        tokensUsed: 0,
      };
    }

    if ((q.includes('alamat') || q.includes('lokasi toko') || q.includes('dimana')) && info?.address) {
      return {
        message: `Alamat ${info.businessName} berlokasi di: ${info.address}${info.phone ? `. Hubungi: ${info.phone}` : ''}`,
        tokensUsed: 0,
      };
    }

    // Slow-Path: General inquiry passed to AI Gateway
    return this.gateway.execute(context, message);
  }
}
