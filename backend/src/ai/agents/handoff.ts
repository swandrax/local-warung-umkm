import type { AIContext, AIResponse } from '../providers';

export class HandoffAgent {
  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const info = context.tenantInfo;
    const contact = info?.phone ? `ke WhatsApp/Telepon kami di ${info.phone}` : 'langsung ke meja kasir/layanan pelanggan kami';

    return {
      message: `Kami mohon maaf atas ketidaknyamanan Anda. Percakapan ini telah diteruskan. Anda dapat menghubungi pengelola ${info?.businessName || 'toko'} ${contact} untuk penanganan segera oleh manusia.`,
      tokensUsed: 0,
    };
  }
}
