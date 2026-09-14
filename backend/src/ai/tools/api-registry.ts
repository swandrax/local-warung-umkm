export interface ApiRouteParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description: string;
}

export interface ApiRouteDefinition {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  category: 'AUTH' | 'PROFILE' | 'PRODUCTS' | 'MITRA' | 'PARTNERSHIPS' | 'PUBLIC' | 'CHAT_AI' | 'UPLOAD' | 'ANALYTICS' | 'ADMIN';
  access: 'PUBLIC' | 'USER' | 'MITRA' | 'ADMIN';
  title: string;
  description: string;
  parameters?: ApiRouteParameter[];
  requestBody?: Record<string, unknown>;
  responseSample?: Record<string, unknown>;
  tags: string[];
}

export const API_ROUTE_REGISTRY: ApiRouteDefinition[] = [
  // --- AUTH ---
  {
    id: 'auth_register',
    path: '/api/auth/register',
    method: 'POST',
    category: 'AUTH',
    access: 'PUBLIC',
    title: 'Daftar Akun Baru',
    description: 'Mendaftarkan pengguna baru dengan email, password, dan nama lengkap.',
    requestBody: {
      email: 'user@example.com',
      password: 'secretPassword123',
      name: 'Budi Santoso',
    },
    responseSample: {
      success: true,
      data: { id: 'uuid', email: 'user@example.com' },
    },
    tags: ['auth', 'register', 'pendaftaran', 'user'],
  },
  {
    id: 'auth_login',
    path: '/api/auth/login',
    method: 'POST',
    category: 'AUTH',
    access: 'PUBLIC',
    title: 'Login Pengguna',
    description: 'Autentikasi pengguna menggunakan email dan password, mengembalikan sesi JWT.',
    requestBody: {
      email: 'user@example.com',
      password: 'secretPassword123',
    },
    responseSample: {
      success: true,
      data: { user: { id: 'uuid', email: 'user@example.com', role: 'USER' } },
    },
    tags: ['auth', 'login', 'masuk', 'jwt'],
  },
  {
    id: 'auth_logout',
    path: '/api/auth/logout',
    method: 'POST',
    category: 'AUTH',
    access: 'PUBLIC',
    title: 'Logout Pengguna',
    description: 'Menghapus cookie auth sesi pengguna.',
    responseSample: { success: true, message: 'Logged out successfully' },
    tags: ['auth', 'logout', 'keluar'],
  },
  {
    id: 'auth_me',
    path: '/api/auth/me',
    method: 'GET',
    category: 'AUTH',
    access: 'USER',
    title: 'Cek Sesi Login (Me)',
    description: 'Mendapatkan data pengguna yang sedang login berdasarkan cookie JWT atau token Bearer.',
    responseSample: {
      success: true,
      data: { id: 'uuid', email: 'user@example.com', role: 'USER' },
    },
    tags: ['auth', 'me', 'session', 'user'],
  },

  // --- PROFILE ---
  {
    id: 'profile_get',
    path: '/api/profile',
    method: 'GET',
    category: 'PROFILE',
    access: 'USER',
    title: 'Ambil Profil Saya',
    description: 'Mendapatkan profil pengguna lengkap (nama, nomor HP, bio, alamat, avatar).',
    responseSample: {
      success: true,
      data: { name: 'Budi', phone: '08123456789', address: 'Jl. Merdeka No. 10', city: 'Jakarta' },
    },
    tags: ['profile', 'user', 'biodata'],
  },
  {
    id: 'profile_update',
    path: '/api/profile',
    method: 'PUT',
    category: 'PROFILE',
    access: 'USER',
    title: 'Perbarui Profil',
    description: 'Memperbarui data pribadi pengguna.',
    requestBody: {
      name: 'Budi Santoso',
      phone: '08123456789',
      avatar: 'https://...',
      bio: 'Pengusaha UMKM lokal',
      address: 'Jl. Melati No. 5',
      city: 'Bandung',
    },
    tags: ['profile', 'edit', 'update'],
  },

  // --- MITRA & WARUNG ---
  {
    id: 'mitra_list',
    path: '/api/mitra',
    method: 'GET',
    category: 'MITRA',
    access: 'PUBLIC',
    title: 'Daftar Semua Mitra Warung',
    description: 'Mengambil daftar seluruh profil mitra warung/UMKM yang aktif.',
    tags: ['mitra', 'warung', 'toko', 'list'],
  },
  {
    id: 'mitra_me',
    path: '/api/mitra/me',
    method: 'GET',
    category: 'MITRA',
    access: 'MITRA',
    title: 'Profil Mitra Saya',
    description: 'Mendapatkan data profil warung milik pengguna yang sedang login.',
    tags: ['mitra', 'me', 'toko', 'warung'],
  },
  {
    id: 'mitra_detail',
    path: '/api/mitra/:id',
    method: 'GET',
    category: 'MITRA',
    access: 'PUBLIC',
    title: 'Detail Toko Mitra',
    description: 'Mendapatkan data lengkap toko mitra berdasarkan ID.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Mitra' },
    ],
    tags: ['mitra', 'detail', 'warung'],
  },
  {
    id: 'mitra_register',
    path: '/api/mitra',
    method: 'POST',
    category: 'MITRA',
    access: 'USER',
    title: 'Daftar Sebagai Mitra UMKM',
    description: 'Mendaftarkan bisnis atau warung baru dan mengubah role user menjadi MITRA.',
    requestBody: {
      businessName: 'Warung Madura Berkah',
      shortDescription: 'Warung kelontong 24 jam terlengkap',
      phone: '081298765432',
      address: 'Jl. Raya Kebon Jeruk No. 8',
      city: 'Jakarta Barat',
      category: 'Kelontong',
      contactUrl: 'https://wa.me/6281298765432',
      operatingHours: JSON.stringify({ default: { openTime: '08:00', closeTime: '22:00', isOpen: true } }),
    },
    tags: ['mitra', 'register', 'buka warung', 'toko'],
  },
  {
    id: 'mitra_update',
    path: '/api/mitra/:id',
    method: 'PUT',
    category: 'MITRA',
    access: 'MITRA',
    title: 'Perbarui Data Toko Mitra',
    description: 'Memperbarui profil warung, kontak, jam operasional, atau deskripsi toko.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Mitra' },
    ],
    requestBody: {
      businessName: 'Warung Madura Berkah Baru',
      phone: '081298765432',
      operatingHours: JSON.stringify({ default: { openTime: '07:00', closeTime: '23:00', isOpen: true } }),
    },
    tags: ['mitra', 'update', 'edit toko'],
  },

  // --- PRODUCTS ---
  {
    id: 'products_list',
    path: '/api/products',
    method: 'GET',
    category: 'PRODUCTS',
    access: 'PUBLIC',
    title: 'Daftar Produk Internal',
    description: 'Mendapatkan daftar produk dengan filter nama atau kategori.',
    parameters: [
      { name: 'q', in: 'query', required: false, type: 'string', description: 'Pencarian nama produk' },
      { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategori produk' },
    ],
    tags: ['products', 'katalog', 'barang'],
  },
  {
    id: 'products_detail',
    path: '/api/products/:id',
    method: 'GET',
    category: 'PRODUCTS',
    access: 'PUBLIC',
    title: 'Detail Produk',
    description: 'Mengambil data detail produk berdasarkan ID produk.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Produk' },
    ],
    tags: ['products', 'detail', 'harga', 'stok'],
  },
  {
    id: 'products_create',
    path: '/api/products',
    method: 'POST',
    category: 'PRODUCTS',
    access: 'MITRA',
    title: 'Tambah Produk Baru',
    description: 'Mitra menambahkan produk atau menu baru ke dalam etalase toko.',
    requestBody: {
      name: 'Kopi Susu Gula Aren',
      description: 'Kopi robusta blend dengan gula aren asli dan susu segar.',
      price: 18000,
      stock: 50,
      category: 'Minuman',
      image: 'https://.../kopi.jpg',
      isPublic: true,
    },
    tags: ['products', 'tambah produk', 'buat menu', 'jual'],
  },
  {
    id: 'products_update',
    path: '/api/products/:id',
    method: 'PUT',
    category: 'PRODUCTS',
    access: 'MITRA',
    title: 'Ubah Data Produk',
    description: 'Memperbarui nama, harga, stok, atau deskripsi produk.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Produk' },
    ],
    requestBody: {
      price: 19000,
      stock: 45,
    },
    tags: ['products', 'update', 'edit produk', 'stok'],
  },
  {
    id: 'products_delete',
    path: '/api/products/:id',
    method: 'DELETE',
    category: 'PRODUCTS',
    access: 'MITRA',
    title: 'Hapus Produk',
    description: 'Menghapus produk dari etalase toko mitra.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Produk' },
    ],
    tags: ['products', 'delete', 'hapus'],
  },

  // --- PUBLIC STOREFRONT & SEARCH ---
  {
    id: 'public_products',
    path: '/api/public/products',
    method: 'GET',
    category: 'PUBLIC',
    access: 'PUBLIC',
    title: 'Katalog Produk Publik (Pencarian & Filter Terlengkap)',
    description: 'Etalase utama publik untuk pencarian produk, filter harga, kategori, ketersediaan stok, dan sorting.',
    parameters: [
      { name: 'q', in: 'query', required: false, type: 'string', description: 'Kata kunci pencarian' },
      { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategori produk' },
      { name: 'minPrice', in: 'query', required: false, type: 'number', description: 'Harga minimum' },
      { name: 'maxPrice', in: 'query', required: false, type: 'number', description: 'Harga maksimum' },
      { name: 'availability', in: 'query', required: false, type: 'string', description: 'AVAILABLE | OUT_OF_STOCK' },
      { name: 'mitraId', in: 'query', required: false, type: 'string', description: 'Filter berdasarkan ID Toko' },
      { name: 'sort', in: 'query', required: false, type: 'string', description: 'newest | price_asc | price_desc | popular' },
      { name: 'page', in: 'query', required: false, type: 'number', description: 'Nomor halaman' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: 'Batas item per halaman' },
    ],
    tags: ['public', 'katalog', 'search', 'filter', 'belanja'],
  },
  {
    id: 'public_product_detail',
    path: '/api/public/products/:id',
    method: 'GET',
    category: 'PUBLIC',
    access: 'PUBLIC',
    title: 'Detail Produk Publik & Produk Terkait',
    description: 'Menampilkan rincian produk, informasi toko, status buka/tutup toko, serta rekomendasi produk serupa.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Produk' },
    ],
    tags: ['public', 'produk detail', 'rekomendasi'],
  },
  {
    id: 'public_mitra_directory',
    path: '/api/public/mitra',
    method: 'GET',
    category: 'PUBLIC',
    access: 'PUBLIC',
    title: 'Direktori Publik Mitra & Warung UMKM',
    description: 'Daftar warung dan toko UMKM di direktori publik dengan status buka/tutup realtime dan filter kota/kategori.',
    parameters: [
      { name: 'q', in: 'query', required: false, type: 'string', description: 'Pencarian nama warung/kota' },
      { name: 'category', in: 'query', required: false, type: 'string', description: 'Kategori usaha' },
      { name: 'page', in: 'query', required: false, type: 'number', description: 'Halaman' },
      { name: 'limit', in: 'query', required: false, type: 'number', description: 'Limit' },
    ],
    tags: ['public', 'mitra', 'direktori', 'warung'],
  },
  {
    id: 'public_mitra_detail',
    path: '/api/public/mitra/:id',
    method: 'GET',
    category: 'PUBLIC',
    access: 'PUBLIC',
    title: 'Profil Toko Publik Lengkap dengan Etalase',
    description: 'Etalase lengkap toko mitra: profil, jam operasional, kontak WA, daftar produk aktif, dan kemitraan.',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'string', description: 'ID Toko Mitra' },
    ],
    tags: ['public', 'etalase', 'toko', 'warung'],
  },

  // --- PARTNERSHIPS ---
  {
    id: 'partnerships_list',
    path: '/api/partnerships',
    method: 'GET',
    category: 'PARTNERSHIPS',
    access: 'USER',
    title: 'Daftar Kemitraan Saya',
    description: 'Melihat permohonan kemitraan yang diajukan atau diterima.',
    tags: ['partnerships', 'kolaborasi', 'mitra'],
  },
  {
    id: 'partnerships_create',
    path: '/api/partnerships',
    method: 'POST',
    category: 'PARTNERSHIPS',
    access: 'USER',
    title: 'Ajukan Kemitraan Baru',
    description: 'Mengajukan proposal kerjasama bisnis atau kemitraan dengan warung/mitra tertentu.',
    requestBody: {
      partnerId: 'uuid-mitra-tujuan',
      title: 'Kerjasama Pasokan Bahan Baku Kopi',
      shortDescription: 'Penyediaan biji kopi roast kualitas premium dengan diskon volume.',
      description: 'Detail penawaran pasokan...',
    },
    tags: ['partnerships', 'ajukan kerjasama', 'kolaborasi'],
  },

  // --- UPLOAD ---
  {
    id: 'upload_image',
    path: '/api/upload',
    method: 'POST',
    category: 'UPLOAD',
    access: 'USER',
    title: 'Upload Gambar / Foto',
    description: 'Mengunggah file foto/gambar produk atau banner toko (multipart/form-data).',
    requestBody: {
      image: '(file binary)',
    },
    responseSample: {
      success: true,
      data: { url: '/uploads/abc123_foto.jpg' },
    },
    tags: ['upload', 'foto', 'gambar', 'image'],
  },

  // --- ANALYTICS ---
  {
    id: 'analytics_log_event',
    path: '/api/analytics/event',
    method: 'POST',
    category: 'ANALYTICS',
    access: 'PUBLIC',
    title: 'Catat Event Analitik',
    description: 'Mencatat aktivitas interaksi (product_view, mitra_view, contact_click, cta_click).',
    requestBody: {
      event: 'product_view',
      resourceType: 'products',
      resourceId: 'uuid-product',
      sessionId: 'session-client-123',
    },
    tags: ['analytics', 'tracking', 'telemetry'],
  },

  // --- CHAT AI & GROQ REASONING ---
  {
    id: 'chat_ai_cognitive',
    path: '/api/chat',
    method: 'POST',
    category: 'CHAT_AI',
    access: 'PUBLIC',
    title: 'Asisten AI Pelanggan & Pemikir Kognitif (Groq + Vision)',
    description: 'Chatbot AI interaktif dengan penalaran logis 4 tahap (Perception, Evaluation, Action Selection, Synthesis), dukungan gambar multimodal, token bucket rate limiter, dan priority queue.',
    requestBody: {
      tenantId: 'uuid-mitra',
      message: 'Halo, apakah kopi susu gula aren tersedia dan berapa harganya?',
      conversationId: 'optional-uuid-percakapan',
      imageUrl: 'https://.../foto-struk-atau-produk.jpg (opsional)',
    },
    responseSample: {
      success: true,
      data: {
        conversationId: 'uuid',
        message: 'Halo! Kopi Susu Gula Aren tersedia dengan harga Rp 18.000.',
        thinking: 'Pengguna menanyakan ketersediaan produk spesifik. Ditemukan di katalog.',
        action: {
          type: 'SHOW_PRODUCTS',
          payload: { products: [{ name: 'Kopi Susu Gula Aren', price: 18000 }] },
        },
        tokensUsed: 142,
        latencyMs: 180,
      },
    },
    tags: ['ai', 'chat', 'groq', 'chatbot', 'kognitif', 'asisten'],
  },
  {
    id: 'ai_route_planner',
    path: '/api/ai/plan-routes',
    method: 'POST',
    category: 'CHAT_AI',
    access: 'PUBLIC',
    title: 'Perencana Rute API AI (Groq AI Route Planner)',
    description: 'AI Groq membaca seluruh katalog route API project ini dan memberikan panduan serta daftar spesifik API call yang diperlukan untuk kebutuhan integrasi atau fitur tertentu.',
    requestBody: {
      requirement: 'Bagaimana cara menambahkan produk baru lengkap dengan upload fotonya lalu menampilkan di etalase?',
      role: 'MITRA',
    },
    tags: ['ai', 'route planner', 'api usage', 'groq', 'developer'],
  },
  {
    id: 'ai_routes_read',
    path: '/api/routes',
    method: 'GET',
    category: 'CHAT_AI',
    access: 'PUBLIC',
    title: 'Introspeksi Katalog API Route Proyek',
    description: 'Membaca seluruh metadata endpoint API yang tersedia di backend lengkap dengan method, path, parameter, dan contoh payload.',
    parameters: [
      { name: 'category', in: 'query', required: false, type: 'string', description: 'Filter kategori: AUTH | PRODUCTS | MITRA | PUBLIC dll' },
      { name: 'q', in: 'query', required: false, type: 'string', description: 'Pencarian endpoint' },
    ],
    tags: ['api usage', 'routes', 'introspection', 'docs'],
  },
];

/**
 * Returns all API routes
 */
export function getAllApiRoutes(): ApiRouteDefinition[] {
  return API_ROUTE_REGISTRY;
}

/**
 * Filter routes by category or search term
 */
export function findApiRoutes(category?: string, query?: string): ApiRouteDefinition[] {
  let list = API_ROUTE_REGISTRY;
  if (category) {
    const catUpper = category.toUpperCase();
    list = list.filter((r) => r.category === catUpper);
  }
  if (query) {
    const qLower = query.toLowerCase();
    list = list.filter(
      (r) =>
        r.path.toLowerCase().includes(qLower) ||
        r.title.toLowerCase().includes(qLower) ||
        r.description.toLowerCase().includes(qLower) ||
        r.tags.some((t) => t.toLowerCase().includes(qLower))
    );
  }
  return list;
}

/**
 * Formats the API route catalog into a compact Markdown document
 * optimized for LLM system prompts (Groq/Llama/GPT).
 */
export function formatApiRoutesForPrompt(filterCategory?: string): string {
  const routes = filterCategory ? findApiRoutes(filterCategory) : API_ROUTE_REGISTRY;

  return routes
    .map((r) => {
      let paramStr = '';
      if (r.parameters?.length) {
        paramStr = `\n  - Params: ${r.parameters.map((p) => `${p.name} (${p.in}, ${p.type})`).join(', ')}`;
      }
      let bodyStr = '';
      if (r.requestBody) {
        bodyStr = `\n  - Body: ${JSON.stringify(r.requestBody)}`;
      }
      return `- [${r.method}] ${r.path} (${r.category} | Akses: ${r.access}): ${r.description}${paramStr}${bodyStr}`;
    })
    .join('\n');
}
