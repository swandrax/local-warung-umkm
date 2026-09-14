<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';

  let featuredProducts: any[] = [];
  let latestProducts: any[] = [];
  let popularProducts: any[] = [];
  let mitraList: any[] = [];
  let partnerships: any[] = [];
  let loading = true;
  let searchQuery = '';
  let searchTimer: any;

  const categories = [
    { name: 'Kuliner & Minuman', slug: 'Kuliner', icon: '🍲' },
    { name: 'Sembako & Warung', slug: 'Sembako', icon: '🛒' },
    { name: 'Kerajinan Tangan', slug: 'Kerajinan', icon: '🎨' },
    { name: 'Fashion & Tekstil', slug: 'Fashion', icon: '👕' },
    { name: 'Pertanian & Segar', slug: 'Pertanian', icon: '🌱' },
    { name: 'Jasa & Layanan', slug: 'Jasa', icon: '🔧' }
  ];

  onMount(async () => {
    try {
      const [featRes, latestRes, popRes, mitraRes, partRes] = await Promise.all([
        api.get('/public/products?limit=4'),
        api.get('/public/products?sort=newest&limit=4'),
        api.get('/public/products?sort=popular&limit=4'),
        api.get('/public/mitra?limit=4'),
        api.get('/public/partnerships?limit=3')
      ]);

      featuredProducts = featRes.data || [];
      latestProducts = latestRes.data || [];
      popularProducts = popRes.data || [];
      mitraList = mitraRes.data || [];
      partnerships = partRes.data || [];
    } catch (e) {
      console.error('Error fetching public discovery data', e);
    } finally {
      loading = false;
    }
  });

  function handleSearchSubmit() {
    if (searchQuery.trim()) {
      // Track analytics search
      api.post('/analytics/event', { 
        event: 'search', 
        resourceType: 'PRODUCT', 
        metadata: { query: searchQuery.trim() } 
      }).catch(() => {});

      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleCategoryClick(catSlug: string) {
    navigate(`/products?category=${encodeURIComponent(catSlug)}`);
  }

  function formatPrice(val: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }
</script>

<svelte:head>
  <title>Lokal Warung - Etalase Digital UMKM & Kolaborasi Lokal</title>
  <meta name="description" content="Temukan produk UMKM unggulan, direktori mitra lokal, etalase warung, dan program kemitraan strategis tanpa ribet." />
  <meta property="og:title" content="Lokal Warung - Platform UMKM & Mitra Lokal" />
  <meta property="og:description" content="Temukan produk UMKM terverifikasi dan hubungi pemilik langsung." />
</svelte:head>

<!-- 1. HERO SECTION -->
<section class="hero-section">
  <div class="hero-container">
    <div class="hero-badge">Pemberdayaan Usaha Lokal & UMKM</div>
    <h1 class="hero-title">Produk Lokal Berkualitas, Terhubung Langsung ke Pemilik Usaha</h1>
    <p class="hero-subtitle">
      Jelajahi ratusan produk pilihan dari warung dan pelaku UMKM lokal terpercaya. Dukung perekonomian lokal dengan belanja dan bermitra langsung.
    </p>
    
    <!-- 2. SEARCH SECTION WITH DEBOUNCE CAPABILITY -->
    <form class="search-box" on:submit|preventDefault={handleSearchSubmit}>
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        placeholder="Cari produk seperti kopi, sambal, keripik, kerajinan..." 
        bind:value={searchQuery} 
      />
      <Button type="submit">Cari Produk</Button>
    </form>

    <div class="quick-tags">
      <span class="tag-label">Pencarian Populer:</span>
      <button type="button" class="quick-chip" on:click={() => handleCategoryClick('Kuliner')}>Kuliner</button>
      <button type="button" class="quick-chip" on:click={() => handleCategoryClick('Sembako')}>Sembako</button>
      <button type="button" class="quick-chip" on:click={() => handleCategoryClick('Kerajinan')}>Kerajinan</button>
    </div>
  </div>
</section>

<div class="container main-content">
  {#if loading}
    <div class="skeleton-grid">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>
  {:else}
    <!-- 3. FEATURED PRODUCTS SECTION -->
    {#if featuredProducts.length > 0}
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Produk Pilihan (Featured)</h2>
            <p class="section-desc">Rekomendasi terbaik produk UMKM minggu ini</p>
          </div>
          <a href="/products" class="view-all-link">Lihat Semua Katalog &rarr;</a>
        </div>
        <div class="product-grid">
          {#each featuredProducts as p}
            <a href={`/products/${p.id}`} class="product-card-link">
              <Card>
                <div class="img-wrapper">
                  {#if p.image}
                    <img src={p.image} alt={p.name} class="product-img" loading="lazy" />
                  {:else}
                    <div class="img-placeholder">Foto Produk</div>
                  {/if}
                  <span class={`status-badge ${p.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
                    {p.availability === 'AVAILABLE' ? 'Tersedia' : 'Habis'}
                  </span>
                </div>
                <div class="card-info">
                  {#if p.category}
                    <span class="pill-category">{p.category}</span>
                  {/if}
                  <h3 class="prod-name">{p.name}</h3>
                  <div class="prod-price">{formatPrice(p.price)}</div>
                  {#if p.mitraName}
                    <div class="prod-store">📍 {p.mitraName} {p.city ? `(${p.city})` : ''}</div>
                  {/if}
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 4. LATEST PRODUCTS SECTION -->
    {#if latestProducts.length > 0}
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Produk Terbaru</h2>
            <p class="section-desc">Produk yang baru saja ditambahkan oleh mitra lokal kami</p>
          </div>
          <a href="/products?sort=newest" class="view-all-link">Jelajahi Terbaru &rarr;</a>
        </div>
        <div class="product-grid">
          {#each latestProducts as p}
            <a href={`/products/${p.id}`} class="product-card-link">
              <Card>
                <div class="img-wrapper">
                  {#if p.image}
                    <img src={p.image} alt={p.name} class="product-img" loading="lazy" />
                  {:else}
                    <div class="img-placeholder">Foto Produk</div>
                  {/if}
                  <span class={`status-badge ${p.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
                    {p.availability === 'AVAILABLE' ? 'Tersedia' : 'Habis'}
                  </span>
                </div>
                <div class="card-info">
                  {#if p.category}
                    <span class="pill-category">{p.category}</span>
                  {/if}
                  <h3 class="prod-name">{p.name}</h3>
                  <div class="prod-price">{formatPrice(p.price)}</div>
                  {#if p.mitraName}
                    <div class="prod-store">📍 {p.mitraName} {p.city ? `(${p.city})` : ''}</div>
                  {/if}
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 5. POPULAR PRODUCTS SECTION -->
    {#if popularProducts.length > 0}
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Paling Banyak Dilihat</h2>
            <p class="section-desc">Produk yang sedang diminati banyak pengunjung</p>
          </div>
          <a href="/products?sort=popular" class="view-all-link">Katalog Terpopuler &rarr;</a>
        </div>
        <div class="product-grid">
          {#each popularProducts as p}
            <a href={`/products/${p.id}`} class="product-card-link">
              <Card>
                <div class="img-wrapper">
                  {#if p.image}
                    <img src={p.image} alt={p.name} class="product-img" loading="lazy" />
                  {:else}
                    <div class="img-placeholder">Foto Produk</div>
                  {/if}
                  <span class={`status-badge ${p.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
                    {p.availability === 'AVAILABLE' ? 'Tersedia' : 'Habis'}
                  </span>
                </div>
                <div class="card-info">
                  {#if p.category}
                    <span class="pill-category">{p.category}</span>
                  {/if}
                  <h3 class="prod-name">{p.name}</h3>
                  <div class="prod-price">{formatPrice(p.price)}</div>
                  {#if p.mitraName}
                    <div class="prod-store">📍 {p.mitraName} {p.city ? `(${p.city})` : ''}</div>
                  {/if}
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 6. CATEGORIES SECTION -->
    <section class="section">
      <div class="section-header">
        <div>
          <h2 class="section-title">Kategori Unggulan</h2>
          <p class="section-desc">Pilih produk berdasarkan sektor kebutuhan Anda</p>
        </div>
      </div>
      <div class="category-grid">
        {#each categories as cat}
          <button type="button" class="category-card" on:click={() => handleCategoryClick(cat.slug)}>
            <span class="cat-icon">{cat.icon}</span>
            <span class="cat-name">{cat.name}</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- 7. LOCAL MITRA SECTION -->
    {#if mitraList.length > 0}
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Mitra & Warung Lokal</h2>
            <p class="section-desc">Kenali pelaku usaha di sekitar Anda</p>
          </div>
        </div>
        <div class="mitra-grid">
          {#each mitraList as m}
            <a href={`/mitra/${m.id}`} class="mitra-card-link">
              <Card>
                <div class="mitra-banner">
                  {#if m.coverImage}
                    <img src={m.coverImage} alt={m.businessName} class="cover-img" loading="lazy" />
                  {:else}
                    <div class="cover-placeholder"></div>
                  {/if}
                  <div class="logo-circle">
                    {#if m.logo}
                      <img src={m.logo} alt={m.businessName} />
                    {:else}
                      <span>🏪</span>
                    {/if}
                  </div>
                </div>
                <div class="mitra-body">
                  <div class="mitra-top">
                    <h3 class="mitra-name">{m.businessName}</h3>
                    {#if m.operatingStatus === 'OPEN'}
                      <span class="store-badge open">BUKA</span>
                    {:else if m.operatingStatus === 'CLOSED'}
                      <span class="store-badge closed">TUTUP</span>
                    {/if}
                  </div>
                  <p class="mitra-city">📍 {m.city || 'Indonesia'} • <span class="cat-text">{m.category || 'UMKM'}</span></p>
                  <p class="mitra-desc">{m.shortDescription || 'Mitra binaan lokal siap melayani kebutuhan Anda.'}</p>
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 8. PARTNERSHIP SHOWCASE SECTION -->
    {#if partnerships.length > 0}
      <section class="section">
        <div class="section-header">
          <div>
            <h2 class="section-title">Peluang Kerjasama & Partnership</h2>
            <p class="section-desc">Kolaborasi antar usaha untuk berkembang bersama</p>
          </div>
          <a href="/partnerships" class="view-all-link">Lihat Semua Program &rarr;</a>
        </div>
        <div class="partnership-grid">
          {#each partnerships as p}
            <a href={`/partnerships/${p.id}`} class="partnership-card-link">
              <Card>
                {#if p.image}
                  <img src={p.image} alt={p.title} class="part-img" loading="lazy" />
                {:else}
                  <div class="part-placeholder">🤝 Partnership</div>
                {/if}
                <div class="part-content">
                  <h3 class="part-title">{p.title}</h3>
                  <p class="part-partner">Oleh: <strong>{p.partnerName || 'Mitra Usaha'}</strong></p>
                  <p class="part-desc">{p.shortDescription || 'Program kerjasama terbuka untuk memperluas jangkauan pasar.'}</p>
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- 9. CTA SECTION -->
    <section class="cta-banner">
      <div class="cta-inner">
        <h2>Punya Usaha atau Ingin Menjadi Mitra Kami?</h2>
        <p>Daftarkan tokomu secara gratis, tampilkan produkmu ke ribuan calon pelanggan lokal, dan temukan peluang kemitraan baru.</p>
        <div class="cta-actions">
          <a href="/login" class="btn-primary-cta">Daftar Sebagai Mitra</a>
          <a href="/products" class="btn-secondary-cta">Jelajahi Produk Lain</a>
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .hero-section {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid var(--border);
    padding: 3.5rem 1rem 4rem;
    text-align: center;
  }
  .hero-container {
    max-width: 800px;
    margin: 0 auto;
  }
  .hero-badge {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    margin-bottom: 1.25rem;
  }
  .hero-title {
    font-size: 2.25rem;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.25;
    margin-bottom: 1rem;
    letter-spacing: -0.025em;
  }
  .hero-subtitle {
    font-size: 1.0625rem;
    color: #475569;
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  .search-box {
    display: flex;
    align-items: center;
    background: white;
    border: 2px solid #cbd5e1;
    border-radius: 0.75rem;
    padding: 0.35rem 0.5rem 0.35rem 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transition: border-color 0.2s;
  }
  .search-box:focus-within {
    border-color: var(--primary);
  }
  .search-icon {
    font-size: 1.1rem;
    margin-right: 0.5rem;
  }
  .search-box input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 0.9375rem;
    color: #1e293b;
    padding: 0.5rem 0;
  }
  .quick-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.25rem;
    flex-wrap: wrap;
  }
  .tag-label {
    font-size: 0.8125rem;
    color: #64748b;
  }
  .quick-chip {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 9999px;
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
    color: #334155;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
  }
  .quick-chip:hover {
    background: #f8fafc;
    border-color: var(--primary);
    color: var(--primary);
  }
  .main-content {
    max-width: 1200px;
    margin: 2.5rem auto 5rem;
    padding: 0 1rem;
  }
  .section {
    margin-bottom: 3.5rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 1.5rem;
  }
  .section-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }
  .section-desc {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0.25rem 0 0;
  }
  .view-all-link {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--primary);
    text-decoration: none;
  }
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.25rem;
  }
  .product-card-link, .mitra-card-link, .partnership-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
    height: 100%;
  }
  .img-wrapper {
    position: relative;
    width: 100%;
    height: 170px;
    background: #f1f5f9;
    overflow: hidden;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }
  .product-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .img-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 0.875rem;
  }
  .status-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }
  .status-badge.avail {
    background: #dcfce7;
    color: #15803d;
  }
  .status-badge.out {
    background: #fee2e2;
    color: #b91c1c;
  }
  .card-info {
    padding: 0.875rem 1rem 1rem;
  }
  .pill-category {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #0369a1;
    background: #f0f9ff;
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    display: inline-block;
    margin-bottom: 0.4rem;
  }
  .prod-name {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.35rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .prod-price {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #0284c7;
    margin-bottom: 0.35rem;
  }
  .prod-store {
    font-size: 0.75rem;
    color: #64748b;
  }
  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 1rem;
  }
  .category-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.625rem;
    padding: 1.25rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .category-card:hover {
    transform: translateY(-2px);
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  .cat-icon {
    font-size: 2rem;
  }
  .cat-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
  }
  .mitra-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1.25rem;
  }
  .mitra-banner {
    position: relative;
    height: 90px;
    background: #e2e8f0;
  }
  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .cover-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #e0f2fe 0%, #f1f5f9 100%);
  }
  .logo-circle {
    position: absolute;
    bottom: -18px;
    left: 1rem;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 1.25rem;
  }
  .logo-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .mitra-body {
    padding: 1.5rem 1rem 1rem;
  }
  .mitra-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }
  .mitra-name {
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }
  .store-badge {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.2rem;
  }
  .store-badge.open {
    background: #dcfce7;
    color: #15803d;
  }
  .store-badge.closed {
    background: #f1f5f9;
    color: #64748b;
  }
  .mitra-city {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0 0 0.5rem;
  }
  .cat-text {
    font-weight: 600;
    color: #0369a1;
  }
  .mitra-desc {
    font-size: 0.8125rem;
    color: #475569;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .partnership-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
  }
  .part-img {
    width: 100%;
    height: 140px;
    object-fit: cover;
  }
  .part-placeholder {
    width: 100%;
    height: 140px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: #64748b;
    font-weight: 600;
  }
  .part-content {
    padding: 1rem;
  }
  .part-title {
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.25rem;
  }
  .part-partner {
    font-size: 0.75rem;
    color: #475569;
    margin: 0 0 0.5rem;
  }
  .part-desc {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cta-banner {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 3rem 1.5rem;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  }
  .cta-inner {
    max-width: 650px;
    margin: 0 auto;
  }
  .cta-inner h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.75rem;
  }
  .cta-inner p {
    font-size: 0.9375rem;
    color: #475569;
    line-height: 1.6;
    margin: 0 0 1.75rem;
  }
  .cta-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .btn-primary-cta {
    background: var(--primary);
    color: white;
    padding: 0.65rem 1.25rem;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.875rem;
    text-decoration: none;
    transition: background 0.2s;
  }
  .btn-primary-cta:hover {
    background: var(--primary-hover);
  }
  .btn-secondary-cta {
    background: #f1f5f9;
    color: #334155;
    padding: 0.65rem 1.25rem;
    border-radius: 0.375rem;
    font-weight: 600;
    font-size: 0.875rem;
    text-decoration: none;
  }
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  .skeleton-card {
    height: 240px;
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 0.5rem;
  }
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
