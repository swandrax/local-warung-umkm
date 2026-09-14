import type { AIContext, AIResponse } from '../providers';
import type { AIGateway } from '../gateway';

export class OrderAgent {
  constructor(private gateway: AIGateway) {}

  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const info = context.tenantInfo;
    const phone = info?.phone || '';

    // Fast-path guidance for local UMKM orders
    return {
      message: `Siap Kak! Untuk cek nota belanja atau konfirmasi pesanan di ${info?.businessName || 'warung kami'}, Kakak cukup sebutkan nomor nota atau kirim bukti fotonya${phone ? ` ke WhatsApp kami di ${phone}` : ''} ya. Tim kami langsung bantu cek dengan senang hati! 😊📦`,
      tokensUsed: 0,
    };

  }
}
