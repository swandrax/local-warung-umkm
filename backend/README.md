# 🚀 Local Warung UMKM - Backend Server

Layanan REST API untuk platform **Local Warung UMKM** dibangun menggunakan runtime performa tinggi **Bun** dan web framework **ElysiaJS**, didukung oleh **Drizzle ORM** dan basis data **SQLite**.

---

## 🛠️ Tech Stack Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [ElysiaJS](https://elysiajs.com/) (v1.4+)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) + SQLite (`sqlite.db`)
- **Autentikasi**: `@elysiajs/jwt` + `Bun.password` (Argon2id/bcrypt)
- **CORS & Static Assets**: `@elysiajs/cors`, `@elysiajs/static`
- **Keamanan Berkas**: Validasi Magic Bytes (JPEG/PNG/WEBP) & Anti-Directory Traversal

---

## 🚀 Panduan Memulai

### 1. Instalasi Dependensi
```bash
bun install
```

### 2. Inisialisasi & Migrasi Basis Data
```bash
# Menjalankan migrasi tabel dan seed data awal
bun run src/db/migrate.ts

# (Opsional) Mengelola skema via Drizzle Kit
bun run db:push
bun run db:studio
```

### 3. Menjalankan Server Development
```bash
bun run dev
```
> Server akan berjalan di `http://localhost:3000`.

### 4. Menjalankan Uji Integrasi (Automated Tests)
```bash
bun run src/test_sprint2b.ts
```

---

## 📂 Struktur Modul Backend (`src/`)
- `db/`: Skema Drizzle (`schema.ts`), koneksi driver (`index.ts`), dan migrasi (`migrate.ts`).
- `middleware/`: Autentikasi JWT dan pengecekan role pengguna (`auth.ts`).
- `services/`: Layanan penyimpanan berkas dengan inspeksi tanda tangan biner (`storage.ts`).
- `routes/`:
  - `public.ts`: Katalog produk publik, filter & pencarian, perhitungan status buka toko, resolusi anti-N+1.
  - `auth.ts`: Registrasi, login, session, dan profil akun.
  - `mitra.ts`: Profil usaha, jam operasional, dan pengelolaan mitra.
  - `products.ts`: CRUD produk warung bagi mitra yang terautentikasi.
  - `partnerships.ts`: Pengajuan dan persetujuan kolaborasi antar UMKM.
  - `admin.ts`: Antrean moderasi konten (`APPROVE`/`REJECT`), log audit, metrik rasio konversi.
  - `analytics.ts`: Pencatatan impresi dan klik pengguna secara asinkron.
  - `upload.ts`: Endpoint pengunggahan berkas media aman.

Untuk dokumentasi lengkap metode dan algoritma, lihat [ALGORITMA_DAN_IMPLEMENTASI.md](../ALGORITMA_DAN_IMPLEMENTASI.md).