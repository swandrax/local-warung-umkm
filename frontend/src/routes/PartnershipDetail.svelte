<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';

  export let id: string;

  let partnership: any = null;
  let loading = true;
  let errorMsg = '';

  const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23f3f4f6"><rect width="600" height="400"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle">Gambar Tidak Tersedia</text></svg>';

  onMount(async () => {
    await fetchPartnershipDetail();
    // Track partnership view event
    try {
      await api.post('/analytics/event', {
        event: 'partnership_view',
        resourceType: 'partnership',
        resourceId: id,
        sessionId: getOrCreateSessionId()
      });
    } catch {}
  });

  function getOrCreateSessionId() {
    let sid = sessionStorage.getItem('umkm_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('umkm_session_id', sid);
    }
    return sid;
  }

  async function fetchPartnershipDetail() {
    loading = true;
    errorMsg = '';
    try {
      const res = await api.get(`/public/partnerships/${id}`);
      if (res.data) {
        partnership = res.data;
      } else {
        errorMsg = 'Program partnership tidak ditemukan.';
      }
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal memuat rincian partnership.';
    } finally {
      loading = false;
    }
  }

  function handleCtaClick() {
    try {
      api.post('/analytics/event', {
        event: 'cta_click',
        resourceType: 'partnership',
        resourceId: id,
        sessionId: getOrCreateSessionId()
      });
    } catch {}
  }
</script>

<svelte:head>
  {#if partnership}
    <title>{partnership.title} - Partnership UMKM</title>
    <meta name="description" content={partnership.shortDescription || partnership.description?.substring(0, 150) || 'Peluang kolaborasi dan partnership UMKM lokal.'} />
    <meta property="og:title" content={partnership.title} />
    <meta property="og:description" content={partnership.shortDescription || partnership.description?.substring(0, 150)} />
    {#if partnership.image}
      <meta property="og:image" content={partnership.image} />
    {/if}
  {:else}
    <title>Detail Partnership - Local Warung</title>
  {/if}
</svelte:head>

<div class="container">
  <div class="breadcrumb">
    <a href="/partnerships" class="back-link">← Kembali ke Daftar Partnership</a>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Memuat rincian partnership...</p>
    </div>
  {:else if errorMsg}
    <div class="error-state">
      <h2>Peluang Tidak Ditemukan</h2>
      <p>{errorMsg}</p>
      <a href="/partnerships" class="btn-primary">Lihat Peluang Lainnya</a>
    </div>
  {:else if partnership}
    <div class="partnership-layout">
      <!-- Main Content -->
      <div class="main-column">
        <div class="banner-wrapper">
          <img 
            src={partnership.image || fallbackImage} 
            alt={partnership.title} 
            class="banner-img"
            loading="lazy"
            on:error={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
          />
          <span class="badge-status">PUBLISHED / AKTIF</span>
        </div>

        <h1 class="partnership-title">{partnership.title}</h1>
        
        {#if partnership.shortDescription}
          <p class="lead-text">{partnership.shortDescription}</p>
        {/if}

        <div class="content-section">
          <h2>Deskripsi Program Kolaborasi</h2>
          <div class="desc-text">
            {partnership.description || 'Tidak ada deskripsi detail tambahan untuk program partnership ini.'}
          </div>
        </div>

        {#if partnership.benefits && partnership.benefits.length > 0}
          <div class="content-section">
            <h2>Keuntungan & Benefit Kemitraan</h2>
            <ul class="benefits-list">
              {#each partnership.benefits as benefit}
                <li>
                  <span class="check-icon">✓</span>
                  <span>{benefit}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <!-- Sidebar -->
      <aside class="sidebar-column">
        <!-- Partner Card -->
        {#if partnership.partner}
          <Card>
            <div class="partner-card">
              <div class="partner-header">
                {#if partnership.partner.logo}
                  <img src={partnership.partner.logo} alt={partnership.partner.businessName} class="partner-avatar" />
                {:else}
                  <div class="partner-avatar-placeholder">{partnership.partner.businessName.charAt(0)}</div>
                {/if}
                <div>
                  <h3 class="partner-name">{partnership.partner.businessName}</h3>
                  {#if partnership.partner.city}
                    <p class="partner-loc">📍 {partnership.partner.city}</p>
                  {/if}
                </div>
              </div>

              {#if partnership.partner.shortDescription}
                <p class="partner-bio">{partnership.partner.shortDescription}</p>
              {/if}

              <a href="/mitra/{partnership.partner.id}" class="visit-mitra-btn">
                Lihat Profil Mitra & Produk →
              </a>
            </div>
          </Card>
        {/if}

        <!-- CTA Box -->
        <Card>
          <div class="cta-box">
            <h3>Tertarik Bermitra?</h3>
            <p>Diskusikan kolaborasi langsung dengan pihak Mitra melalui kontak resmi berikut:</p>
            
            {#if partnership.contactUrl}
              <a 
                href={partnership.contactUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                class="cta-btn"
                on:click={handleCtaClick}
              >
                {partnership.contactLabel || 'Hubungi Mitra via WhatsApp'}
              </a>
            {:else if partnership.partner?.contactUrl}
              <a 
                href={partnership.partner.contactUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                class="cta-btn"
                on:click={handleCtaClick}
              >
                {partnership.partner.contactLabel || 'Hubungi Mitra'}
              </a>
            {:else}
              <p class="no-cta">Kontak langsung tidak disediakan oleh mitra pada postingan ini.</p>
            {/if}

            <p class="cta-note">
              🔒 Komunikasi aman dan langsung terhubung tanpa perantara.
            </p>
          </div>
        </Card>
      </aside>
    </div>

    <!-- Related Products From Partner -->
    {#if partnership.relatedProducts && partnership.relatedProducts.length > 0}
      <section class="related-section">
        <h2>Produk Unggulan dari Mitra Ini</h2>
        <div class="related-grid">
          {#each partnership.relatedProducts as prod}
            <a href="/products/{prod.id}" class="related-card">
              <img 
                src={prod.image || fallbackImage} 
                alt={prod.name} 
                class="related-img"
                loading="lazy"
                on:error={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
              />
              <div class="related-info">
                <h4>{prod.name}</h4>
                <p class="related-price">Rp {Number(prod.price).toLocaleString('id-ID')}</p>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: 1140px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  .breadcrumb {
    margin-bottom: 1.5rem;
  }
  .back-link {
    color: #4b5563;
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
  }
  .back-link:hover {
    color: #1f2937;
    text-decoration: underline;
  }

  .loading-state, .error-state {
    text-align: center;
    padding: 4rem 1rem;
    background: #ffffff;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
  }
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .partnership-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 2rem;
    align-items: start;
  }

  .banner-wrapper {
    position: relative;
    width: 100%;
    height: 360px;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #f3f4f6;
    margin-bottom: 1.5rem;
    border: 1px solid #e5e7eb;
  }
  .banner-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .badge-status {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: #10b981;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .partnership-title {
    font-size: 2.25rem;
    font-weight: 800;
    color: #111827;
    line-height: 1.25;
    margin-bottom: 0.75rem;
  }
  .lead-text {
    font-size: 1.15rem;
    color: #4b5563;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .content-section {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.75rem;
    margin-bottom: 1.5rem;
  }
  .content-section h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
  }
  .desc-text {
    color: #374151;
    line-height: 1.7;
    white-space: pre-line;
  }

  .benefits-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .benefits-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    font-size: 1rem;
    color: #374151;
  }
  .check-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: #dcfce7;
    color: #15803d;
    font-weight: bold;
    border-radius: 50%;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  /* Sidebar */
  .sidebar-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .partner-card {
    padding: 0.5rem;
  }
  .partner-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .partner-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #e5e7eb;
  }
  .partner-avatar-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #e0e7ff;
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.5rem;
  }
  .partner-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.2rem;
  }
  .partner-loc {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .partner-bio {
    font-size: 0.9rem;
    color: #4b5563;
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }
  .visit-mitra-btn {
    display: block;
    text-align: center;
    padding: 0.65rem;
    background: #f3f4f6;
    color: #374151;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 0.375rem;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .visit-mitra-btn:hover {
    background: #e5e7eb;
    color: #111827;
  }

  .cta-box {
    padding: 0.5rem;
  }
  .cta-box h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }
  .cta-box p {
    font-size: 0.9rem;
    color: #4b5563;
    margin-bottom: 1.25rem;
    line-height: 1.5;
  }
  .cta-btn {
    display: block;
    width: 100%;
    text-align: center;
    background: #10b981;
    color: #ffffff;
    padding: 0.85rem;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 1rem;
    text-decoration: none;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    transition: background 0.15s ease;
  }
  .cta-btn:hover {
    background: #059669;
  }
  .cta-note {
    font-size: 0.78rem !important;
    color: #9ca3af !important;
    text-align: center;
    margin-top: 1rem;
    margin-bottom: 0 !important;
  }

  /* Related Products */
  .related-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
  .related-section h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1.25rem;
  }
  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.25rem;
  }
  .related-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
    text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .related-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }
  .related-img {
    width: 100%;
    height: 140px;
    object-fit: cover;
    background: #f3f4f6;
  }
  .related-info {
    padding: 0.85rem;
  }
  .related-info h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.35rem;
  }
  .related-price {
    font-size: 0.9rem;
    font-weight: 700;
    color: #2563eb;
  }

  @media (max-width: 860px) {
    .partnership-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
