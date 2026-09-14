/**
 * Neon Auth Client for Svelte 5 & Web Apps
 * Connects directly to Neon Auth (managed Better-Auth endpoint):
 * https://ep-small-butterfly-a7sfee50.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth
 */

export interface NeonUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface NeonSession {
  id: string;
  userId: string;
  expiresAt: string;
  user: NeonUser;
}

export class NeonAuthClient {
  private baseUrl: string;

  constructor(url = import.meta.env.VITE_NEON_AUTH_URL) {
    this.baseUrl = (url || 'https://ep-small-butterfly-a7sfee50.neonauth.ap-southeast-2.aws.neon.tech/neondb/auth').replace(/\/$/, '');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ data?: T; error?: any }> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: json.error || json.message || `Auth error (${res.status})` };
      }
      return { data: json as T };
    } catch (err: any) {
      return { error: err.message || 'Koneksi ke Neon Auth gagal.' };
    }
  }

  /**
   * Daftar akun baru menggunakan Email & Password
   */
  async signUpEmail(email: string, password: string, name?: string) {
    return this.request('/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  /**
   * Masuk menggunakan Email & Password
   */
  async signInEmail(email: string, password: string) {
    return this.request('/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * Masuk menggunakan Akun Sosial (Google, GitHub, dll)
   */
  signInSocial(provider: 'google' | 'github') {
    window.location.href = `${this.baseUrl}/sign-in/social?provider=${provider}&callbackURL=${encodeURIComponent(window.location.origin)}`;
  }

  /**
   * Keluar / Logout sesi
   */
  async signOut() {
    return this.request('/sign-out', {
      method: 'POST',
    });
  }

  /**
   * Dapatkan sesi pengguna saat ini (terverifikasi oleh cookie HTTP-only)
   */
  async getSession(): Promise<{ user: NeonUser | null; session: NeonSession | null }> {
    const { data, error } = await this.request<any>('/get-session', {
      method: 'GET',
    });

    if (error || !data) {
      return { user: null, session: null };
    }

    return {
      user: data.user || null,
      session: data.session || null,
    };
  }
}

// Singleton Neon Auth instance for Svelte & Frontend components
export const neonAuth = new NeonAuthClient();
