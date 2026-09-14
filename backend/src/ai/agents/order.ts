import type { AIContext, AIResponse } from '../providers';
import type { AIGateway } from '../gateway';

export class OrderAgent {
  constructor(private gateway: AIGateway) {}

  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const info = context.tenantInfo;
    const phone = info?.phone || '';

    // Fast-path guidance for local UMKM orders
    return {
      message: `Untuk pengecekan status pesanan atau pemesanan langsung di ${info?.businessName || 'toko kami'}, silakan kirim nomor nota atau bukti transaksi${phone ? ` via WhatsApp di ${phone}` : ''}. Staf kami akan segera membantu Anda.`,
      tokensUsed: 0,
    };
  }
}
