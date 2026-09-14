import type { AIContext, AIResponse, AgentAction } from '../providers';

export interface CognitiveOutput {
  thinking: string;
  action: AgentAction;
  response: string;
}

export class CognitiveReasoningEngine {
  /**
   * Generates the system prompt instructing the AI to use step-by-step logical reasoning
   * and output structured thinking, action, and customer response.
   */
  static buildCognitivePrompt(context: AIContext): string {
    const info = context.tenantInfo;
    let businessPrompt = '';
    if (info) {
      businessPrompt = `
DATA TOKO & PROFIL UMKM:
- Nama Bisnis: ${info.businessName}
- Kategori: ${info.category || 'UMKM Lokal'}
- Alamat: ${info.address || 'Tidak ditentukan'}
- Kontak / WA: ${info.phone || 'Tidak ditentukan'}
- Jam Operasional: ${info.operatingHours ? JSON.stringify(info.operatingHours) : '08:00 - 20:00'}

KATALOG PRODUK TERSEDIA:
${info.availableProducts?.length ? info.availableProducts.map(p => `- ID: ${p.id} | ${p.name} | Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.stock} | ${p.description || ''}`).join('\n') : '(Belum ada produk terdaftar)'}
`;
    }

    return `Anda adalah Agen AI Berakal (Cognitive Reasoning AI Agent) untuk bisnis UMKM lokal.
${businessPrompt}

=== TUGAS & PROSES PENALARAN LOGIS (LOGICAL THINKING & REASONING) ===
Untuk SETIAP input pengguna (apapun bentuknya: pertanyaan umum, komplain, negosiasi, foto produk, permintaan rekomendasi, atau pertanyaan tak terduga), Anda WAJIB menjalankan 4 langkah penalaran logis sebelum merespons:

1. [PERCEPTION]: Analisis maksud tersembunyi, sentimen pengguna, dan apakah ada konteks gambar (vision) yang dilampirkan.
2. [EVALUATION]: Cek fakta dari DATA TOKO & KATALOG PRODUK di atas. Jika pengguna menanyakan produk di luar katalog, jangan pernah berhalusinasi.
3. [ACTION SELECTION]: Tentukan tipe aksi terbaik dari daftar berikut:
   - 'REPLY_INFO': Memberikan info jam buka, alamat, petunjuk umum toko.
   - 'SHOW_PRODUCTS': Menampilkan rekomendasi produk dengan menyertakan array produk di payload.
   - 'ORDER_TRACK': Menjelaskan alur cek status pesanan atau konfirmasi nota.
   - 'ESCALATE_HUMAN': Meneruskan ke staf manusia jika pelanggan komplain berat/kecewa.
   - 'ASK_CLARIFICATION': Meminta rincian tambahan jika input terlalu ambigu.
   - 'CUSTOM_ACTION': Tindakan khusus sesuai kebutuhan unik pengguna.
4. [SYNTHESIS]: Susun jawaban ramah, bersahabat, sopan, dan solutif dalam Bahasa Indonesia.

FORMAT OUTPUT WAJIB BERUPA JSON VALID (tanpa teks pengantar di luar JSON):
{
  "thinking": "<Tuliskan alur penalaran logis Anda di sini secara singkat: mengapa memilih aksi ini dan bagaimana Anda mengevaluasi data toko>",
  "action": {
    "type": "<Tipe aksi: REPLY_INFO | SHOW_PRODUCTS | ORDER_TRACK | ESCALATE_HUMAN | ASK_CLARIFICATION | CUSTOM_ACTION>",
    "payload": { ...data terstruktur relevan... }
  },
  "response": "<Pesan ramah untuk pengguna>"
}`;
  }

  /**
   * Parses the model output into structured thinking, action, and response.
   * Handles JSON outputs, <think>...</think> reasoning tags, and plain text fallbacks.
   */
  static parseCognitiveOutput(rawText: string, defaultActionType = 'REPLY_INFO'): CognitiveOutput {
    // 1. Try parsing JSON directly or from markdown ```json ```
    try {
      let jsonString = rawText.trim();
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      }

      // Find first '{' and last '}'
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        if (parsed.response || parsed.thinking || parsed.action) {
          return {
            thinking: parsed.thinking || 'Penalaran kontekstual selesai.',
            action: parsed.action || { type: defaultActionType },
            response: parsed.response || parsed.message || rawText,
          };
        }
      }
    } catch {
      // JSON parse failed, proceed to tag / heuristic extraction
    }

    // 2. Try parsing <think>...</think> tags (DeepSeek / Llama reasoning format)
    const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
    if (thinkMatch) {
      const thinking = thinkMatch[1].trim();
      const response = thinkMatch[2].trim();
      return {
        thinking,
        action: { type: defaultActionType },
        response,
      };
    }

    // 3. Fallback: plain text output
    return {
      thinking: 'Mengevaluasi input pengguna secara langsung berdasarkan konteks bisnis.',
      action: { type: defaultActionType },
      response: rawText,
    };
  }
}
