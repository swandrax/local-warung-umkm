<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  
  export let id: string;
  let mitra: any = null;
  let loading = true;
  let errorMsg = '';

  const daysOrder = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' }
  ];

  onMount(async () => {
    try {
      const res = await api.get(`/public/mitra/${id}`);
      mitra = res.data;

      // Track analytics view
      api.post('/analytics/event', {
        event: 'mitra_view',
        resourceType: 'MITRA',
        resourceId: id,
        metadata: { businessName: mitra.businessName, city: mitra.city }
      }).catch(() => {});
    } catch (e: any) {
      errorMsg = 'Mitra tidak ditemukan atau profil belum dipublikasikan.';
    } finally {
      loading = false;
    }
  });

  function sanitizeUrl(url: string): string {
    if (!url) return '#';
    if (url.match(/^(https?|tel|mailto):/)) {
      return url;
    }
    return '#';
  }

  function handleContactClick() {
    api.post('/analytics/event', {
      event: 'contact_click',
      resourceType: 'MITRA',
      resourceId: id,
      metadata: { contactUrl: mitra.contactUrl }
    }).catch(() => {});
  }

  function formatPrice(val: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }
</script>

<svelte:head>
  {#if mitra}
    <title>{mitra.businessName} - Mitra Lokal Warung</title>
    <meta name="description" content={mitra.shortDescription || mitra.description || 'Profil mitra lokal warung'} />
    <meta property="og:title" content={mitra.businessName} />
    {#if mitra.logo}
      <meta property="og:image" content={mitra.logo} />
    {/if}
  {:else}
    <title>Profil Mitra - Lokal Warung</title>
  {/if}
</svelte:head>

<div class="container">
  {#if loading}
    <div class="loading-state">Memuat profil dan etalase mitra...</div>
  {:else if errorMsg}
    <div class="error-state">
      <h2>Profil Tidak Tersedia</h2>
      <p>{errorMsg}</p>
      <a href="/" class="back-link">&larr; Kembali ke Beranda</a>
    </div>
  {:else if mitra}
    <!-- STOREFRONT HEADER -->
    <div class="storefront-card">
      <div class="cover-container">
        {#if mitra.coverImage}
          <img src={mitra.coverImage} alt="Cover" class="cover-img" loading="lazy" />
        {:else}
          <div class="cover-placeholder"></div>
        {/if}
      </div>
      
      <div class="profile-meta-row">
        <div class="logo-box">
          {#if mitra.logo}
            <img src={mitra.logo} alt="Logo" class="logo-img" />
          {:else}
            <div class="logo-placeholder">{mitra.businessName.charAt(0)}</div>
          {/if}
        </div>
        
        <div class="meta-texts">
          <div class="title-status-line">
            <h1>{mitra.businessName}</h1>
            {#if mitra.operatingStatus === 'OPEN'}
              <span class="status-pill open">BUKA</span>
            {:else if mitra.operatingStatus === 'CLOSED'}
              <span class="status-pill closed">TUTUP</span>
            {/if}
          </div>

          <div class="sub-tags">
            <span class="category-pill">{mitra.category || 'UMKM Lokal'}</span>
            {#if mitra.city}
              <span class="loc-text">📍 {mitra.city} {mitra.address ? `• ${mitra.address}` : ''}</span>
            {/if}
          </div>

          {#if mitra.shortDescription}
            <p class="short-desc">{mitra.shortDescription}</p>
          {/if}
        </div>
        
        <div class="cta-col">
          {#if mitra.contactUrl}
            <a 
              href={sanitizeUrl(mitra.contactUrl)} 
              target="_blank" 
              rel="noopener noreferrer" 
              class="contact-action-btn"
              on:click={handleContactClick}
            >
              💬 {mitra.contactLabel || 'Hubungi Mitra'}
            </a>
          {/if}
        </div>
      </div>
    </div>

    <div class="layout-grid">
      <!-- LEFT: PRODUCTS & PARTNERSHIPS -->
      <div class="main-column">
        <!-- PRODUCTS SECTION -->
        <section class="section-block">
          <div class="block-header">
            <h2>Produk dari Toko Ini</h2>
            <span class="count-pill">{mitra.products ? mitra.products.length : 0} Produk</span>
          </div>

          {#if mitra.products && mitra.products.length > 0}
            <div class="products-grid">
              {#each mitra.products as p}
                <a href={`/products/${p.id}`} class="prod-item-link">
                  <Card>
                    <div class="prod-img-box">
                      {#if p.image}
                        <img src={p.image} alt={p.name} loading="lazy" />
                      {:else}
                        <div class="img-ph">Foto</div>
                      {/if}
                      <span class={`stock-indicator ${p.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
                        {p.availability === 'AVAILABLE' ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>
                    <div class="prod-info-box">
                      <h4>{p.name}</h4>
                      <div class="prod-price">{formatPrice(p.price)}</div>
                    </div>
                  </Card>
                </a>
              {/each}
            </div>
          {:else}
            <div class="empty-box">Mitra ini belum memiliki produk publik yang aktif.</div>
          {/if}
        </section>

        <!-- PARTNERSHIPS SECTION -->
        {#if mitra.partnerships && mitra.partnerships.length > 0}
          <section class="section-block">
            <div class="block-header">
              <h2>Program Kerjasama</h2>
            </div>
            <div class="part-list">
              {#each mitra.partnerships as pr}
                <a href={`/partnerships/${pr.id}`} class="part-item-link">
                  <Card>
                    <div class="part-row">
                      {#if pr.image}
                        <img src={pr.image} alt={pr.title} class="part-thumb" />
                      {:else}
                        <div class="part-thumb-ph">🤝</div>
                      {/if}
                      <div class="part-details">
                        <h4>{pr.title}</h4>
                        <p>{pr.shortDescription || 'Program kemitraan terbuka untuk umum.'}</p>
                      </div>
                    </div>
                  </Card>
                </a>
              {/each}
            </div>
          </section>
        {/if}
      </div>

      <!-- RIGHT: OPERATING HOURS & ABOUT -->
      <div class="side-column">
        <!-- ABOUT CARD -->
        <Card title="Tentang Toko">
          <div class="about-content">
            <p>{mitra.description || mitra.shortDescription || 'Pelaku UMKM lokal terpercaya.'}</p>
            {#if mitra.phone}
              <div class="contact-meta">📞 Telepon: {mitra.phone}</div>
            {/if}
            {#if mitra.website}
              <div class="contact-meta">🌐 Website: <a href={sanitizeUrl(mitra.website)} target="_blank" rel="noopener noreferrer">{mitra.website}</a></div>
            {/if}
          </div>
        </Card>

        <!-- OPERATING HOURS CARD -->
        <div class="mt-4">
          <Card title="Jam Operasional">
            {#if mitra.operatingHours}
              <div class="hours-list">
                {#each daysOrder as d}
                  {@const sched = mitra.operatingHours[d.key]}
                  <div class="day-row">
                    <span class="day-name">{d.label}</span>
                    {#if sched && sched.isOpen}
                      <span class="day-time">{sched.openTime || '08:00'} - {sched.closeTime || '17:00'}</span>
                    {:else}
                      <span class="day-closed">Tutup</span>
                    {/if}
                  </div>
                {/each}
                <div class="tz-note">Zona Waktu: {mitra.timezone || 'WIB (Asia/Jakarta)'}</div>
              </div>
            {:else}
              <p class="text-muted">Jadwal operasional belum dikonfigurasi.</p>
            {/if}
          </Card>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1100px;
    margin: 2rem auto 5rem;
    padding: 0 1rem;
  }
  .storefront-card {
    background: white;
    border-radius: 1rem;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    margin-bottom: 2rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .cover-container {
    height: 220px;
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
    background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  }
  .profile-meta-row {
    padding: 0 1.5rem 1.5rem;
    display: flex;
    align-items: flex-end;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .logo-box {
    margin-top: -45px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 4px solid white;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
    flex-shrink: 0;
  }
  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .logo-placeholder {
    width: 100%;
    height: 100%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.25rem;
    font-weight: 700;
  }
  .meta-texts {
    flex: 1;
    min-width: 250px;
    padding-top: 0.5rem;
  }
  .title-status-line {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .title-status-line h1 {
    font-size: 1.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
  }
  .status-pill {
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
  }
  .status-pill.open {
    background: #dcfce7;
    color: #15803d;
  }
  .status-pill.closed {
    background: #f1f5f9;
    color: #64748b;
  }
  .sub-tags {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.35rem 0 0.5rem;
  }
  .category-pill {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369a1;
    background: #f0f9ff;
    padding: 0.15rem 0.5rem;
    border-radius: 0.25rem;
  }
  .loc-text {
    font-size: 0.8125rem;
    color: #64748b;
  }
  .short-desc {
    color: #475569;
    font-size: 0.875rem;
    margin: 0;
  }
  .cta-col {
    margin-bottom: 0.25rem;
  }
  .contact-action-btn {
    display: inline-block;
    background: #16a34a;
    color: white;
    padding: 0.65rem 1.25rem;
    border-radius: 0.375rem;
    font-weight: 700;
    font-size: 0.875rem;
    text-decoration: none;
    transition: background 0.2s;
  }
  .contact-action-btn:hover {
    background: #15803d;
  }
  .layout-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.75rem;
  }
  @media (max-width: 800px) {
    .layout-grid {
      grid-template-columns: 1fr;
    }
  }
  .section-block {
    margin-bottom: 2rem;
  }
  .block-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .block-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
  }
  .count-pill {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
  }
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  .prod-item-link, .part-item-link {
    text-decoration: none;
    color: inherit;
  }
  .prod-img-box {
    position: relative;
    height: 140px;
    background: #f8fafc;
    overflow: hidden;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }
  .prod-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .img-ph {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 0.75rem;
  }
  .stock-indicator {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.2rem;
  }
  .stock-indicator.avail {
    background: #dcfce7;
    color: #15803d;
  }
  .stock-indicator.out {
    background: #fee2e2;
    color: #b91c1c;
  }
  .prod-info-box {
    padding: 0.75rem;
  }
  .prod-info-box h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    color: #1e293b;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .prod-price {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #0284c7;
  }
  .part-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .part-row {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    align-items: center;
  }
  .part-thumb {
    width: 60px;
    height: 60px;
    border-radius: 0.375rem;
    object-fit: cover;
  }
  .part-thumb-ph {
    width: 60px;
    height: 60px;
    border-radius: 0.375rem;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  .part-details h4 {
    font-size: 0.9375rem;
    margin: 0 0 0.2rem;
    color: #1e293b;
  }
  .part-details p {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
  }
  .about-content p {
    font-size: 0.875rem;
    line-height: 1.6;
    color: #475569;
    margin: 0 0 1rem;
  }
  .contact-meta {
    font-size: 0.8125rem;
    color: #334155;
    margin-top: 0.5rem;
  }
  .contact-meta a {
    color: var(--primary);
    text-decoration: none;
  }
  .mt-4 {
    margin-top: 1.5rem;
  }
  .hours-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .day-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed #f1f5f9;
  }
  .day-name {
    font-weight: 600;
    color: #334155;
  }
  .day-time {
    color: #15803d;
    font-weight: 500;
  }
  .day-closed {
    color: #94a3b8;
  }
  .tz-note {
    font-size: 0.6875rem;
    color: #94a3b8;
    margin-top: 0.5rem;
    text-align: right;
  }
  .empty-box {
    padding: 2rem 1rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.875rem;
    border: 1px dashed #cbd5e1;
    border-radius: 0.5rem;
    background: white;
  }
  .loading-state, .error-state {
    text-align: center;
    padding: 4rem 1rem;
    background: white;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    color: #64748b;
  }
  .error-state h2 {
    color: #b91c1c;
    margin: 0 0 0.5rem;
  }
  .back-link {
    display: inline-block;
    margin-top: 1rem;
    color: var(--primary);
    text-decoration: none;
    font-weight: 600;
  }
</style>
