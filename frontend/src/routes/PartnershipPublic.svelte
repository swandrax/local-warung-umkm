<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  
  let partnerships: any[] = [];
  let loading = true;
  let page = 1;
  let hasMore = true;
  let total = 0;

  const fallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23f3f4f6"><rect width="600" height="400"/><text x="50%" y="50%" font-family="sans-serif" font-size="20" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle">Partnership Image</text></svg>';

  onMount(async () => {
    await loadPartnerships();
  });

  async function loadPartnerships() {
    if (!hasMore && page > 1) return;
    loading = true;
    
    try {
      const res = await api.get(`/public/partnerships?page=${page}&limit=12`);
      const newData = res.data;
      total = res.pagination?.total || 0;
      
      if (newData.length < 12) {
        hasMore = false;
      }
      
      partnerships = [...partnerships, ...newData];
      page += 1;
    } catch (e) {
      console.error('Failed to load partnerships', e);
    } finally {
      loading = false;
    }
  }

  function handleCtaClick(id: string) {
    try {
      let sid = sessionStorage.getItem('umkm_session_id') || 'sess_' + Math.random().toString(36).substring(2);
      sessionStorage.setItem('umkm_session_id', sid);
      api.post('/analytics/event', {
        event: 'cta_click',
        resourceType: 'partnership',
        resourceId: id,
        sessionId: sid
      });
    } catch {}
  }
</script>

<svelte:head>
  <title>Peluang Kolaborasi & Partnership UMKM - Local Warung</title>
  <meta name="description" content="Temukan peluang kemitraan bisnis, suplai produk lokal, dan kolaborasi B2B dengan warung dan pelaku UMKM terpercaya." />
  <meta property="og:title" content="Peluang Kolaborasi & Partnership UMKM" />
  <meta property="og:description" content="Temukan peluang kemitraan bisnis dan suplai produk lokal bersama UMKM pilihan." />
</svelte:head>

<div class="container">
  <div class="header">
    <span class="subheading">KOLABORASI & B2B UMKM</span>
    <h1>Peluang Partnership & Kemitraan</h1>
    <p>Perluas jaringan bisnis dan bangun ekosistem usaha bersama warung dan produsen lokal terbaik.</p>
  </div>

  {#if partnerships.length === 0 && !loading}
    <div class="empty-state">
      <h3>Belum Ada Peluang Aktif</h3>
      <p>Peluang kolaborasi baru akan segera dipublikasikan oleh mitra kami.</p>
    </div>
  {:else}
    <div class="grid">
      {#each partnerships as p}
        <div class="partnership-card">
          <div class="image-wrapper">
            <a href="/partnerships/{p.id}">
              <img 
                src={p.image || fallbackImage} 
                alt={p.title} 
                class="card-img" 
                loading="lazy"
                on:error={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackImage; }}
              />
            </a>
            <span class="status-tag">PUBLISHED</span>
          </div>
          
          <div class="card-body">
            {#if p.partnerName}
              <div class="partner-meta">
                <span class="partner-name">🏢 {p.partnerName}</span>
                {#if p.partnerCity}
                  <span class="partner-city">📍 {p.partnerCity}</span>
                {/if}
              </div>
            {/if}

            <h3 class="card-title">
              <a href="/partnerships/{p.id}">{p.title}</a>
            </h3>

            {#if p.shortDescription}
              <p class="desc">{p.shortDescription}</p>
            {/if}

            <div class="card-footer">
              <a href="/partnerships/{p.id}" class="detail-link">
                Detail Program →
              </a>
              {#if p.contactUrl}
                <a 
                  href={p.contactUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="contact-btn"
                  on:click={() => handleCtaClick(p.id)}
                >
                  {p.contactLabel || 'Ajukan Kemitraan'}
                </a>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if loading}
      <div class="loading-more">
        <div class="mini-spinner"></div>
        <p>Memuat peluang kemitraan...</p>
      </div>
    {/if}

    {#if hasMore && !loading}
      <div class="load-more-wrapper">
        <button class="load-more-btn" on:click={loadPartnerships}>
          Muat Lebih Banyak ({partnerships.length} dari {total})
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  .header {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .subheading {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #2563eb;
    background: #eff6ff;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    margin-bottom: 0.75rem;
  }
  .header h1 {
    font-size: 2.25rem;
    font-weight: 800;
    color: #111827;
    margin-bottom: 0.5rem;
  }
  .header p {
    color: #6b7280;
    font-size: 1.05rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .partnership-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .partnership-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }

  .image-wrapper {
    position: relative;
    width: 100%;
    height: 190px;
    background: #f3f4f6;
    overflow: hidden;
  }
  .card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .status-tag {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: #10b981;
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    letter-spacing: 0.05em;
  }

  .card-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .partner-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }
  .partner-name {
    font-weight: 600;
    color: #374151;
  }

  .card-title {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.35;
    margin-bottom: 0.5rem;
  }
  .card-title a {
    color: #111827;
    text-decoration: none;
  }
  .card-title a:hover {
    color: #2563eb;
  }

  .desc {
    color: #4b5563;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1.25rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }
  .detail-link {
    font-size: 0.875rem;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
  }
  .detail-link:hover {
    text-decoration: underline;
  }
  .contact-btn {
    display: inline-block;
    background-color: #10b981;
    color: white;
    padding: 0.5rem 0.85rem;
    border-radius: 0.375rem;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: background-color 0.15s ease;
  }
  .contact-btn:hover {
    background-color: #059669;
  }

  .load-more-wrapper {
    text-align: center;
    margin-top: 2.5rem;
  }
  .load-more-btn {
    background: #ffffff;
    border: 1px solid #d1d5db;
    color: #374151;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.65rem 1.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .load-more-btn:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .empty-state, .loading-more {
    text-align: center;
    padding: 3rem 1rem;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    color: #6b7280;
  }
  .mini-spinner {
    width: 28px;
    height: 28px;
    margin: 0 auto 0.75rem;
    border: 2px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
