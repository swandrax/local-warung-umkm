import type { AIContext, TenantBusinessContext } from '../providers';

export interface WorldStateSnapshot {
  currentTimeWIB: string;
  dayOfWeek: string;
  isOpenNow: boolean;
  operatingHoursDisplay: string;
  storeName: string;
  category: string;
  location: string;
  contactWa: string;
  activeCatalogSummary: string[];
  promotionsOrPartnerships?: string[];
  customerInferredNeed?: string;
}

export class WarungWorldModel {
  /**
   * Builds an environmental state snapshot of the physical warung
   * reflecting current real-world time, store status, catalog inventory, and neighborhood context.
   */
  static buildWorldState(context: AIContext, userPrompt?: string): WorldStateSnapshot {
    const info = context.tenantInfo;
    const now = new Date();

    // Format WIB (UTC+7)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const formattedDate = new Intl.DateTimeFormat('id-ID', options).format(now);
    const dayName = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).format(now).toLowerCase();

    let isOpenNow = true;
    let operatingHoursDisplay = 'Buka Setiap Hari (24 Jam)';

    if (info?.operatingHours) {
      const hours = info.operatingHours as Record<string, { openTime?: string; closeTime?: string; isOpen?: boolean }>;
      const todayHours = hours[dayName] || hours['default'];
      if (todayHours) {
        if (todayHours.isOpen === false) {
          isOpenNow = false;
          operatingHoursDisplay = `Tutup Hari Ini (${dayName})`;
        } else if (todayHours.openTime && todayHours.closeTime) {
          operatingHoursDisplay = `${todayHours.openTime} - ${todayHours.closeTime} WIB`;
        }
      }
    }

    const catalogSummary: string[] = [];
    if (info?.availableProducts && info.availableProducts.length > 0) {
      for (const prod of info.availableProducts) {
        const stockStatus = prod.stock > 0 ? `Tersedia (${prod.stock} porsi/unit)` : 'Habis sementara';
        catalogSummary.push(`${prod.name}: Rp ${prod.price.toLocaleString('id-ID')} [${stockStatus}]`);
      }
    }

    // Infer customer mental state from input
    let customerInferredNeed = 'Menjelajahi warung & tanya produk';
    if (userPrompt) {
      const lower = userPrompt.toLowerCase();
      if (lower.includes('kopi') || lower.includes('minum') || lower.includes('lapar') || lower.includes('makan') || lower.includes('roti')) {
        customerInferredNeed = 'Ingin pesan makanan/minuman siap saji';
      } else if (lower.includes('beras') || lower.includes('minyak') || lower.includes('telur') || lower.includes('sembako')) {
        customerInferredNeed = 'Belanja kebutuhan pokok dapur (sembako)';
      } else if (lower.includes('buka') || lower.includes('tutup') || lower.includes('alamat') || lower.includes('lokasi')) {
        customerInferredNeed = 'Mencari informasi operasional fisik toko';
      } else if (lower.includes('mitra') || lower.includes('titip') || lower.includes('konsinyasi') || lower.includes('kerjasama')) {
        customerInferredNeed = 'Peluang kemitraan / pasokan produk warung';
      }
    }

    return {
      currentTimeWIB: formattedDate,
      dayOfWeek: dayName,
      isOpenNow,
      operatingHoursDisplay,
      storeName: info?.businessName || 'Warung UMKM Lokal',
      category: info?.category || 'Warung Kelontong & Kuliner',
      location: info?.address || 'Pusat Usaha UMKM Lokal',
      contactWa: info?.phone || '0812-9876-5432',
      activeCatalogSummary: catalogSummary,
      customerInferredNeed,
    };
  }

  /**
   * Formats the world model into a clear, natural context block for LLM prompts.
   */
  static formatWorldModelPrompt(snapshot: WorldStateSnapshot): string {
    return `
=== KONDISI DUNIA NYATA WARUNG SAAT INI (WORLD MODEL ENVIRONMENT) ===
- Waktu Lokal (WIB): ${snapshot.currentTimeWIB}
- Status Toko Sekarang: ${snapshot.isOpenNow ? '🟢 BUKA & SIAP MELAYANI' : '🔴 SEDANG TUTUP'} (${snapshot.operatingHoursDisplay})
- Lokasi Toko: ${snapshot.location}
- Kontak WhatsApp / Telepon: ${snapshot.contactWa}
- Kebutuhan Pelanggan Terdeteksi: ${snapshot.customerInferredNeed}

DAFTAR MENU & PRODUK RESMI:
${snapshot.activeCatalogSummary.length ? snapshot.activeCatalogSummary.map(item => `• ${item}`).join('\n') : '• Belum ada data produk'}
`;
  }
}
