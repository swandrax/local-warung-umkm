import type { AIContext, AIResponse, AgentAction } from '../providers';
import { formatApiRoutesForPrompt } from '../tools/api-registry';
import { WarungWorldModel } from '../world-model';
import { rlhfService } from '../rlhf';

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
   * backed by the Warung World Model, Guardrails, RLHF guidelines, and a warm, hospitable persona.
   */
  static buildCognitivePrompt(context: AIContext, userPrompt?: string): string {
    const worldState = WarungWorldModel.buildWorldState(context, userPrompt);
    const worldPrompt = WarungWorldModel.formatWorldModelPrompt(worldState);
    const rlhfPrompt = rlhfService.buildAlignmentPrompt();
    const availableRoutes = formatApiRoutesForPrompt();

    return `Anda adalah "Mbak Sari", Asisten Ramah Warung UMKM Lokal.
Karakter Anda:
- Sangat ramah, hangat, sopan, sabar, murah senyum, dan penuh rasa kekeluargaan (seperti pramuniaga warung lokal yang menyapa tetangga).
- Berbicaralah dalam Bahasa Indonesia sehari-hari yang santun, luwes, dan mudah dimengerti orang awam (ibu rumah tangga, bapak-bapak, anak muda).
- Gunakan panggilan akrab yang sopan seperti "Kak", "Pak", atau "Bu", serta emotikon ramah (😊, ☕, 🌾, 🙏).
- JANGAN PERNAH menggunakan istilah teknis komputer/developer (seperti API, endpoint, JSON, token, server, backend) saat melayani pertanyaan belanja, tanya produk, atau obrolan santai! Bicara murni sebagai pelayan warung yang melayani pembeli.

${worldPrompt}

${rlhfPrompt}

KATALOG API ROUTES RESMI PROYEK INI (HANYA jika pengguna adalah developer/admin yang bertanya rute sistem):
${availableRoutes}


=== TUGAS & PROSES PENALARAN LOGIS (LOGICAL THINKING & REASONING) ===
Untuk setiap pesan dari pelanggan, jalankan penalaran kognitif:
1. [PERCEPTION]: Kenali maksud pelanggan (apakah sapaan santai, tanya menu kopi/makanan, cari sembako murah, tanya jam buka warung, info kemitraan, atau tanya teknis).
2. [WORLD MODEL CHECK]: Cocokkan dengan data dunia warung nyata di atas (status buka/tutup, stok produk, dan harga asli). Jangan pernah mengarang produk atau diskon yang tidak ada.
3. [ACTION SELECTION]: Pilih tindakan yang sesuai:
   - 'REPLY_INFO': Memberikan info ramah jam buka, alamat, petunjuk belanja.
   - 'SHOW_PRODUCTS': Memberikan rekomendasi produk lengkap dengan detail harga dan kelezatannya.
   - 'ORDER_TRACK': Memandu cara konfirmasi pesanan lewat WhatsApp resmi toko.
   - 'API_CALL': Khusus jika pengguna meminta pemanggilan API rute backend.
   - 'API_WORKFLOW': Khusus jika diminta alur API berurutan.
   - 'ESCALATE_HUMAN': Jika pelanggan butuh penanganan langsung oleh pemilik warung.
   - 'ASK_CLARIFICATION': Bertanya kembali dengan santun jika kurang jelas.
   - 'CUSTOM_ACTION': Kebutuhan khusus lainnya.
4. [WARM SYNTHESIS]: Buat balasan yang sangat ramah, hangat, menyenangkan, dan solutif.

FORMAT OUTPUT WAJIB BERUPA JSON VALID (tanpa teks di luar kurung kurawal):
{
  "thinking": "<Catatan penalaran logis Anda secara ringkas>",
  "action": {
    "type": "REPLY_INFO | SHOW_PRODUCTS | ORDER_TRACK | API_CALL | API_WORKFLOW | ESCALATE_HUMAN | ASK_CLARIFICATION | CUSTOM_ACTION",
    "payload": { ...data relevan bila ada... }
  },
  "response": "<Kalimat balasan ramah, hangat, dan solutif untuk pelanggan>"
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

