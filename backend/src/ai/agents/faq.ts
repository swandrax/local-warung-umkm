import type { AIContext, AIResponse } from '../providers';
import type { AIGateway } from '../gateway';

export class FAQAgent {
  constructor(private gateway: AIGateway) {}

  async handle(context: AIContext, message: string): Promise<AIResponse> {
    const q = message.toLowerCase();
    const info = context.tenantInfo;

    // Fast-Path: Deterministic check for opening hours & address without calling LLM (saves tokens and delivers <5ms latency!)
    if ((q.includes('jam buka') || q.includes('buka jam') || q.includes('jam operasional')) && info?.operatingHours) {
      const hours = info.operatingHours as Record<string, any>;
      let hoursText = 'setiap hari 24 jam penuh';
      if (hours.monday?.openTime && hours.monday?.closeTime) {
        if (hours.monday.openTime === '00:00' && hours.monday.closeTime === '23:59') {
          hoursText = 'buka 24 jam nonstop setiap hari';
        } else {
          hoursText = `buka dari jam ${hours.monday.openTime} sampai ${hours.monday.closeTime} WIB`;
        }
      } else if (hours.default?.openTime) {
        hoursText = `buka dari jam ${hours.default.openTime} sampai ${hours.default.closeTime} WIB`;
      }

      return {
        message: `Halo Kak! 😊 Warung ${info.businessName} ${hoursText} ya. Kapan pun Kakak lapar, haus, atau butuh sembako, kami selalu siap melayani dengan senang hati! Ditunggu kedatangannya ya Kak 🙏☕`,
        tokensUsed: 0,
      };
    }

    if ((q.includes('alamat') || q.includes('lokasi toko') || q.includes('dimana') || q.includes('di mana')) && info?.address) {
      return {
        message: `Alamat kami ada di ${info.address} ya Kak 😊📍 Kalau butuh petunjuk arah atau mau pesan dulu lewat WhatsApp, langsung kontak kami di ${info.phone || '0812-9876-5432'}. Sampai jumpa di warung, Kak! 🙏`,
        tokensUsed: 0,
      };
    }


    // Slow-Path: General inquiry passed to AI Gateway
    return this.gateway.execute(context, message);
  }
}
