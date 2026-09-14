<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';

  export let id: string;

  let product: any = null;
  let loading = true;
  let errorMsg = '';
  let activeImage = '';

  onMount(async () => {
    await fetchProduct();
  });

  async function fetchProduct() {
    loading = true;
    errorMsg = '';
    try {
      const res = await api.get(`/public/products/${id}`);
      product = res.data;
      activeImage = product.image || (product.gallery && product.gallery[0]) || '';

      // Log analytics event
      api.post('/analytics/event', {
        event: 'product_view',
        resourceType: 'PRODUCT',
        resourceId: id,
        metadata: { name: product.name, category: product.category }
      }).catch(() => {});
    } catch (e: any) {
      errorMsg = e.error?.message || 'Produk tidak ditemukan atau tidak tersedia untuk publik.';
    } finally {
      loading = false;
    }
  }

  function handleContactClick() {
    api.post('/analytics/event', {
      event: 'contact_click',
      resourceType: 'PRODUCT',
      resourceId: id,
      metadata: { contactUrl: product.mitra?.contactUrl }
    }).catch(() => {});
  }

  function formatPrice(val: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }

  // Security URL sanitizer for CTA
  function sanitizeUrl(url: string): string {
    if (!url) return '#';
    if (url.match(/^(https?|tel|mailto):/)) {
      return url;
    }
    return '#';
  }
</script>

<svelte:head>
  {#if product}
    <title>{product.name} - Lokal Warung</title>
    <meta name="description" content={product.description ? product.description.slice(0, 160) : 'Detail produk UMKM'} />
    <meta property="og:title" content={product.name} />
    <meta property="og:description" content={product.description || 'Produk lokal berkualitas'} />
    {#if product.image}
      <meta property="og:image" content={product.image} />
    {/if}
  {:else}
    <title>Detail Produk - Lokal Warung</title>
  {/if}
</svelte:head>

<div class="container">
  <div class="breadcrumbs">
    <a href="/">Beranda</a> &rsaquo; 
    <a href="/products">Katalog Produk</a> &rsaquo; 
    <span>{product ? product.name : 'Detail Produk'}</span>
  </div>

  {#if loading}
    <div class="loading-box">
      <div class="spinner"></div>
      <p>Memuat informasi produk...</p>
    </div>
  {:else if errorMsg}
    <div class="error-box">
      <h2>Oops!</h2>
      <p>{errorMsg}</p>
      <a href="/products" class="btn-back">&larr; Kembali ke Katalog</a>
    </div>
  {:else if product}
    <div class="product-layout">
      <!-- LEFT: IMAGE GALLERY -->
      <div class="gallery-col">
        <div class="main-image-container">
          {#if activeImage}
            <img src={activeImage} alt={product.name} class="main-image" />
          {:else}
            <div class="main-image-placeholder">
              <span>Foto Produk Belum Tersedia</span>
            </div>
          {/if}
          <span class={`status-badge ${product.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
            {product.availability === 'AVAILABLE' ? 'Stok Tersedia' : 'Stok Habis'}
          </span>
        </div>

        {#if product.gallery && product.gallery.length > 1}
          <div class="thumbnail-strip">
            {#each product.gallery as imgUrl}
              <button 
                type="button" 
                class="thumb-btn" 
                class:active={activeImage === imgUrl} 
                on:click={() => activeImage = imgUrl}
              >
                <img src={imgUrl} alt="Thumbnail" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- RIGHT: DETAILS & ACTIONS -->
      <div class="info-col">
        {#if product.category}
          <span class="category-tag">{product.category}</span>
        {/if}
        <h1 class="product-title">{product.name}</h1>
        <div class="price-tag">{formatPrice(product.price)}</div>

        <div class="desc-box">
          <h3>Deskripsi Produk</h3>
          <p>{product.description || 'Tidak ada deskripsi tambahan untuk produk ini.'}</p>
        </div>

        <!-- MITRA STORE CARD -->
        {#if product.mitra}
          <div class="mitra-card">
            <div class="mitra-header">
              {#if product.mitra.logo}
                <img src={product.mitra.logo} alt={product.mitra.businessName} class="mitra-mini-logo" />
              {:else}
                <div class="mitra-mini-avatar">🏪</div>
              {/if}
              <div>
                <div class="mitra-title-row">
                  <a href={`/mitra/${product.mitra.id}`} class="mitra-name-link">{product.mitra.businessName}</a>
                  {#if product.mitra.operatingStatus === 'OPEN'}
                    <span class="badge-store open">BUKA</span>
                  {:else if product.mitra.operatingStatus === 'CLOSED'}
                    <span class="badge-store closed">TUTUP</span>
                  {/if}
                </div>
                <p class="mitra-loc">📍 {product.mitra.city || 'Indonesia'} {product.mitra.address ? `• ${product.mitra.address}` : ''}</p>
              </div>
            </div>

            <!-- CONTACT CTA -->
            {#if product.mitra.contactUrl}
              <div class="cta-box">
                <a 
                  href={sanitizeUrl(product.mitra.contactUrl)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="btn-cta" 
                  on:click={handleContactClick}
                >
                  💬 {product.mitra.contactLabel || 'Hubungi Mitra / Pesan'}
                </a>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <!-- RELATED PRODUCTS SECTION -->
    {#if product.relatedProducts && product.relatedProducts.length > 0}
      <section class="related-section">
        <div class="section-title-wrap">
          <h2>Produk Serupa</h2>
          <p>Pilihan lain dalam kategori {product.category || 'yang sama'}</p>
        </div>
        <div class="related-grid">
          {#each product.relatedProducts as rp}
            <a href={`/products/${rp.id}`} class="related-card-link">
              <Card>
                <div class="related-img-wrap">
                  {#if rp.image}
                    <img src={rp.image} alt={rp.name} loading="lazy" />
                  {:else}
                    <div class="img-placeholder">Foto</div>
                  {/if}
                </div>
                <div class="related-info">
                  <h4>{rp.name}</h4>
                  <div class="related-price">{formatPrice(rp.price)}</div>
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <!-- MORE FROM THIS MITRA -->
    {#if product.moreFromMitra && product.moreFromMitra.length > 0}
      <section class="related-section">
        <div class="section-title-wrap">
          <h2>Lainnya dari {product.mitra?.businessName || 'Mitra Ini'}</h2>
          <p>Koleksi produk lainnya yang ditawarkan oleh toko ini</p>
        </div>
        <div class="related-grid">
          {#each product.moreFromMitra as mp}
            <a href={`/products/${mp.id}`} class="related-card-link">
              <Card>
                <div class="related-img-wrap">
                  {#if mp.image}
                    <img src={mp.image} alt={mp.name} loading="lazy" />
                  {:else}
                    <div class="img-placeholder">Foto</div>
                  {/if}
                </div>
                <div class="related-info">
                  <h4>{mp.name}</h4>
                  <div class="related-price">{formatPrice(mp.price)}</div>
                </div>
              </Card>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: 1100px;
    margin: 2rem auto 5rem;
    padding: 0 1rem;
  }
  .breadcrumbs {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1.5rem;
  }
  .breadcrumbs a {
    color: var(--primary);
    text-decoration: none;
  }
  .breadcrumbs span {
    color: #1e293b;
    font-weight: 500;
  }
  .product-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  @media (max-width: 768px) {
    .product-layout {
      grid-template-columns: 1fr;
      padding: 1.25rem;
      gap: 1.5rem;
    }
  }
  .gallery-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .main-image-container {
    position: relative;
    width: 100%;
    height: 380px;
    background: #f8fafc;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  .main-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .main-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 0.9375rem;
  }
  .status-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 0.375rem;
  }
  .status-badge.avail {
    background: #dcfce7;
    color: #15803d;
  }
  .status-badge.out {
    background: #fee2e2;
    color: #b91c1c;
  }
  .thumbnail-strip {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }
  .thumb-btn {
    width: 64px;
    height: 64px;
    border: 2px solid #e2e8f0;
    border-radius: 0.375rem;
    overflow: hidden;
    padding: 0;
    background: white;
    cursor: pointer;
  }
  .thumb-btn.active {
    border-color: var(--primary);
  }
  .thumb-btn img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .category-tag {
    font-size: 0.75rem;
    font-weight: 600;
    color: #0369a1;
    background: #f0f9ff;
    padding: 0.2rem 0.6rem;
    border-radius: 0.25rem;
    display: inline-block;
    margin-bottom: 0.5rem;
  }
  .product-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.5rem;
    line-height: 1.3;
  }
  .price-tag {
    font-size: 1.625rem;
    font-weight: 800;
    color: #0284c7;
    margin-bottom: 1.5rem;
  }
  .desc-box {
    margin-bottom: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
  }
  .desc-box h3 {
    font-size: 1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem;
  }
  .desc-box p {
    color: #475569;
    font-size: 0.9375rem;
    line-height: 1.6;
    margin: 0;
    white-space: pre-line;
  }
  .mitra-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
  }
  .mitra-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .mitra-mini-logo {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
  }
  .mitra-mini-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }
  .mitra-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .mitra-name-link {
    font-weight: 700;
    color: #0f172a;
    text-decoration: none;
    font-size: 1rem;
  }
  .mitra-name-link:hover {
    color: var(--primary);
  }
  .badge-store {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border-radius: 0.2rem;
  }
  .badge-store.open {
    background: #dcfce7;
    color: #15803d;
  }
  .badge-store.closed {
    background: #f1f5f9;
    color: #64748b;
  }
  .mitra-loc {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0.2rem 0 0;
  }
  .cta-box {
    margin-top: 0.75rem;
  }
  .btn-cta {
    display: block;
    width: 100%;
    text-align: center;
    background: #16a34a;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 0.9375rem;
    text-decoration: none;
    transition: background 0.2s;
  }
  .btn-cta:hover {
    background: #15803d;
  }
  .related-section {
    margin-top: 3.5rem;
  }
  .section-title-wrap h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 0.25rem;
  }
  .section-title-wrap p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 1.25rem;
  }
  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.25rem;
  }
  .related-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }
  .related-img-wrap {
    height: 140px;
    background: #f1f5f9;
    overflow: hidden;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }
  .related-img-wrap img {
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
    font-size: 0.8125rem;
  }
  .related-info {
    padding: 0.875rem;
  }
  .related-info h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.35rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .related-price {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #0284c7;
  }
  .loading-box, .error-box {
    text-align: center;
    padding: 4rem 1rem;
    background: white;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  .btn-back {
    display: inline-block;
    margin-top: 1rem;
    color: var(--primary);
    font-weight: 600;
    text-decoration: none;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
