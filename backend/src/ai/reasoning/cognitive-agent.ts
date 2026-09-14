import type { AIContext, AIResponse, AgentAction } from '../providers';
import { formatApiRoutesForPrompt } from '../tools/api-registry';

export interface ApiCallStep {
  step: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  access: 'PUBLIC' | 'USER' | 'MITRA' | 'ADMIN';
  description: string;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export interface ApiPlanOutput {
  thinking: string;
  summary: string;
  calls: ApiCallStep[];
  curlExamples?: string[];
  response: string;
}

export interface CognitiveOutput {
  thinking: string;
  action: AgentAction;
  response: string;
}

export class CognitiveReasoningEngine {
  /**
   * Generates the system prompt instructing the AI to use step-by-step logical reasoning
   * with full knowledge of available API routes and output structured thinking, action, and customer response.
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

    const availableRoutes = formatApiRoutesForPrompt();

    return `Anda adalah Agen AI Berakal (Cognitive Reasoning AI Agent) untuk ekosistem platform UMKM lokal.
${businessPrompt}

KATALOG API ROUTES RESMI PROYEK INI:
${availableRoutes}

=== TUGAS & PROSES PENALARAN LOGIS (LOGICAL THINKING & REASONING) ===
Untuk SETIAP input pengguna (pertanyaan umum, foto produk, pertanyaan teknis rute API, alur transaksi, pendaftaran, dsb.), Anda WAJIB menjalankan 4 langkah penalaran logis:

1. [PERCEPTION]: Analisis maksud pengguna, apakah ini pertanyaan konsumen warung, permintaan transaksi, atau kebutuhan integrasi / pemanggilan API route backend.
2. [EVALUATION]: Cek fakta dari DATA TOKO & KATALOG PRODUK di atas, serta KATALOG API ROUTES resmi. Jangan pernah mengarang endpoint yang tidak ada di daftar.
3. [ACTION SELECTION]: Tentukan tipe aksi terbaik dari daftar berikut:
   - 'REPLY_INFO': Memberikan info jam buka, alamat, petunjuk umum toko.
   - 'SHOW_PRODUCTS': Menampilkan rekomendasi produk dengan menyertakan array produk di payload.
   - 'ORDER_TRACK': Menjelaskan alur cek status pesanan atau konfirmasi nota.
   - 'API_CALL': Memberikan panggilan endpoint API spesifik beserta method, path, dan params/body yang relevan.
   - 'API_WORKFLOW': Memberikan urutan pemanggilan API routes untuk menyelesaikan workflow tertentu di proyek.
   - 'ESCALATE_HUMAN': Meneruskan ke staf manusia jika pelanggan komplain berat.
   - 'ASK_CLARIFICATION': Meminta rincian tambahan jika input terlalu ambigu.
   - 'CUSTOM_ACTION': Tindakan khusus sesuai kebutuhan unik pengguna.
4. [SYNTHESIS]: Susun jawaban ramah, solutif, dan jelas dalam Bahasa Indonesia.

FORMAT OUTPUT WAJIB BERUPA JSON VALID (tanpa teks pengantar di luar JSON):
{
  "thinking": "<Tuliskan alur penalaran logis Anda di sini secara singkat>",
  "action": {
    "type": "<Tipe aksi: REPLY_INFO | SHOW_PRODUCTS | ORDER_TRACK | API_CALL | API_WORKFLOW | ESCALATE_HUMAN | ASK_CLARIFICATION | CUSTOM_ACTION>",
    "payload": { ...data terstruktur relevan, misal method, endpoint, params jika API_CALL/API_WORKFLOW... }
  },
  "response": "<Pesan ramah & solutif untuk pengguna>"
}`;
  }

  /**
   * Generates a specialized prompt for AI Route Planning where Groq reads the full API catalog
   * and outputs all sequential API calls needed to fulfill a technical requirement or feature.
   */
  static buildApiPlannerPrompt(requirement: string, role = 'PUBLIC'): string {
    const routeCatalog = formatApiRoutesForPrompt();

    return `Anda adalah Arsitek API dan AI Route Planner untuk proyek platform Warung UMKM Lokal.
Peran pemanggil: ${role}

KATALOG SELURUH ROUTE API YANG TERSEDIA DI PROYEK INI:
${routeCatalog}

KEBUTUHAN PENGGUNA / FITUR YANG DIINGINKAN:
"${requirement}"

TUGAS ANDA:
1. Analisis kebutuhan di atas secara teliti.
2. Pilih HANYA rute-rute API yang benar-benar ada di katalog proyek di atas.
3. Rangkai menjadi urutan pemanggilan API (API calls chain) yang logis dan lengkap, mulai dari persiapan (auth/upload jika perlu) hingga pembacaan (read) atau eksekusi aksi.
4. Sertakan HTTP method, path endpoint, akses role yang dibutuhkan, serta contoh payload body / query parameter yang realistis.

FORMAT OUTPUT HARUS JSON VALID DENGAN SKEMA PERSIS SEPERTI INI:
{
  "thinking": "<Penalaran arsitektural mengapa rute-rute ini dipilih dan urutan langkahnya>",
  "summary": "<Ringkasan singkat alur pemanggilan API>",
  "calls": [
    {
      "step": 1,
      "method": "POST | GET | PUT | DELETE",
      "endpoint": "/api/...",
      "access": "PUBLIC | USER | MITRA | ADMIN",
      "description": "<Penjelasan fungsi rute ini pada langkah ini>",
      "params": { ...query/path params jika ada... },
      "payload": { ...body payload jika ada... }
    }
  ],
  "curlExamples": [
    "curl -X GET http://localhost:3000/api/..."
  ],
  "response": "<Penjelasan lengkap dan ramah dalam Bahasa Indonesia mengenai alur API ini untuk developer / pengguna>"
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

  /**
   * Parses the AI output from the API Route Planner into structured ApiPlanOutput.
   */
  static parseApiPlanOutput(rawText: string, fallbackRequirement = 'Workflow API'): ApiPlanOutput {
    try {
      let jsonString = rawText.trim();
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      }

      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(jsonString.substring(firstBrace, lastBrace + 1));
        if (parsed.calls && Array.isArray(parsed.calls)) {
          return {
            thinking: parsed.thinking || 'Analisis kebutuhan API selesai.',
            summary: parsed.summary || `Rencana alur pemanggilan API untuk: ${fallbackRequirement}`,
            calls: parsed.calls,
            curlExamples: parsed.curlExamples || [],
            response: parsed.response || parsed.summary || rawText,
          };
        }
      }
    } catch {
      // JSON parse fallback
    }

    return {
      thinking: 'Mengevaluasi katalog rute proyek untuk kebutuhan pengguna.',
      summary: `Rekomendasi alur API untuk: ${fallbackRequirement}`,
      calls: [
        {
          step: 1,
          method: 'GET',
          endpoint: '/api/public/products',
          access: 'PUBLIC',
          description: 'Ambil daftar produk publik untuk pengecekan awal.',
        },
      ],
      curlExamples: ['curl -X GET http://localhost:3000/api/public/products'],
      response: rawText,
    };
  }
}

