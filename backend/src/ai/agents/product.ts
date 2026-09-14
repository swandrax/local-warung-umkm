import type { AIContext, AIResponse } from '../providers';
import type { AIGateway } from '../gateway';

export class ProductAgent {
  constructor(private gateway: AIGateway) {}

  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const q = message.toLowerCase();
    const products = context.tenantInfo?.availableProducts || [];

    // Fast-path: Direct keyword search in cached product catalog
    if (products.length > 0) {
      const matched = products.filter((p) => q.includes(p.name.toLowerCase()));
      if (matched.length === 1) {
        const item = matched[0];
        return {
          message: `Wah pas banget Kak! Menu "${item.name}" tersedia di warung kami dengan harga hemat Rp ${item.price.toLocaleString('id-ID')} (stok siap: ${item.stock} unit). ${item.description || ''} Mau disiapkan berapa porsi nih Kak? 😊☕`,
          tokensUsed: 0,
        };

      }
    }

    // Pass through AI Gateway for natural language recommendation / synthesis
    return this.gateway.execute(context, message);
  }
}
