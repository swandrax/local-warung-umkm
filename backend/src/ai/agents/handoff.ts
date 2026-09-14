import type { AIContext, AIResponse } from '../providers';

export class HandoffAgent {
  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const info = context.tenantInfo;
    const contact = info?.phone ? `via WhatsApp di ${info.phone}` : 'langsung ke meja kasir kami';

    return {
      message: `Aduh maaf sekali atas kendala yang dialami ya Kak 🙏 Untuk penanganan yang lebih cepat dan tuntas, yuk langsung hubungi pemilik ${info?.businessName || 'warung kami'} ${contact}. Kami siap bantu dengan sepenuh hati! 😊`,
      tokensUsed: 0,
    };


  }
}
