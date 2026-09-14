# 📱 Local Warung UMKM - Frontend Web App

Aplikasi web antarmuka pengguna untuk platform **Local Warung UMKM** dibangun menggunakan **Svelte 5** generasi terbaru, **TypeScript**, dan **Vite**, serta dilengkapi kapabilitas **Progressive Web App (PWA)** dengan **Service Worker** untuk pengalaman akses yang cepat dan tahan kendala jaringan (Offline-First).

---

## 🛠️ Tech Stack Frontend
- **Framework UI**: [Svelte 5](https://svelte.dev/) (Kompilasi reaktif tanpa Virtual DOM)
- **Tooling & Bundler**: [Vite](https://vitejs.dev/)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: `svelte-routing` (Declarative Client-Side Routing)
- **PWA**: Service Worker (`public/sw.js`) dengan strategi multi-tier caching (Cache-First untuk static assets & Network-First untuk navigasi)
- **HTTP Client**: Custom Fetch Wrapper (`src/lib/api.ts`) dengan auto-retry & exponential/linear backoff untuk request GET.

---

## 🚀 Panduan Memulai

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Development
```bash
npm run dev
```
> Aplikasi web akan berjalan di `http://localhost:5173`.

### 3. Membangun Bundle Produksi & Pemeriksaan Tipe
```bash
# Validasi tipe data TypeScript & komponen Svelte
npm run check

# Membangun bundle produksi teroptimasi
npm run build

# Menjalankan preview lokal hasil bundle
npm run preview
```

---

## 📂 Struktur Halaman & Komponen (`src/`)
- `App.svelte`: Root router, pemantauan event konektivitas browser `online`/`offline`, dan rendering navigasi.
- `routes/`:
  - `Home.svelte`: Halaman utama pencarian produk, kategori cepat, dan rekomendasi warung.
  - `Products.svelte`: Katalog pencarian lengkap dengan multi-filter (kategori, harga, ketersediaan) dan pengurutan.
  - `ProductDetail.svelte`: Spesifikasi detail produk, galeri foto, status buka warung, dan tombol kontak langsung.
  - `MitraPublic.svelte`: Storefront publik profil warung lengkap dengan daftar produk dan jam operasional dinamis.
  - `PartnershipPublic.svelte` & `PartnershipDetail.svelte`: Direktori program kemitraan dan detail penawaran B2B/B2C.
  - `MitraDashboard.svelte`: Panel kelola produk, stok, profil usaha, dan jadwal buka warung.
  - `PartnershipDashboard.svelte`: Panel kelola tawaran kerjasama masuk dan keluar (*Accept*, *Reject*, *Cancel*).
  - `Admin.svelte`: Panel moderasi konten pending, log audit transaksi sistem, dan visualisasi analitik rasio CTR.
  - `Login.svelte`: Halaman masuk dan pendaftaran akun baru.
  - `Profile.svelte`: Pengaturan profil konsumen.
- `lib/`:
  - `api.ts`: Klien API terpusat dengan penanganan galat jaringan dan retry otomatis.
  - `components/`: Komponen antarmuka yang dapat digunakan kembali (`Navbar.svelte`, `Input.svelte`, `Button.svelte`).

Untuk dokumentasi lengkap metode dan algoritma, lihat [ALGORITMA_DAN_IMPLEMENTASI.md](../ALGORITMA_DAN_IMPLEMENTASI.md).
