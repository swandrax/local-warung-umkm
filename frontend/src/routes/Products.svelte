<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';

  let products: any[] = [];
  let loading = true;
  let page = 1;
  let totalPages = 1;
  let totalItems = 0;

  // Filter & Search states
  let searchQuery = '';
  let selectedCategory = 'ALL';
  let minPrice: string = '';
  let maxPrice: string = '';
  let availability = 'ALL';
  let sortBy = 'newest';
  let mitraId = '';

  let searchTimeout: any;

  const categories = [
    { label: 'Semua Kategori', value: 'ALL' },
    { label: 'Kuliner & Minuman', value: 'Kuliner' },
    { label: 'Sembako & Warung', value: 'Sembako' },
    { label: 'Kerajinan Tangan', value: 'Kerajinan' },
    { label: 'Fashion & Tekstil', value: 'Fashion' },
    { label: 'Pertanian & Segar', value: 'Pertanian' },
    { label: 'Jasa & Layanan', value: 'Jasa' }
  ];

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    searchQuery = urlParams.get('q') || '';
    selectedCategory = urlParams.get('category') || 'ALL';
    mitraId = urlParams.get('mitraId') || '';
    sortBy = urlParams.get('sort') || 'newest';

    await loadProducts(1);
  });

  async function loadProducts(targetPage = 1) {
    loading = true;
    page = targetPage;

    try {
      let params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '12');
      params.append('sort', sortBy);

      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (availability !== 'ALL') params.append('availability', availability);
      if (mitraId) params.append('mitraId', mitraId);

      const res = await api.get(`/public/products?${params.toString()}`);
      products = res.data || [];
      if (res.pagination) {
        totalItems = res.pagination.total;
        totalPages = res.pagination.totalPages;
      }
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      // Trigger debounced search
      if (searchQuery.trim()) {
        api.post('/analytics/event', {
          event: 'search',
          resourceType: 'PRODUCT',
          metadata: { query: searchQuery.trim(), category: selectedCategory }
        }).catch(() => {});
      }
      loadProducts(1);
    }, 350);
  }

  function handleFilterChange() {
    loadProducts(1);
  }

  function resetFilters() {
    searchQuery = '';
    selectedCategory = 'ALL';
    minPrice = '';
    maxPrice = '';
    availability = 'ALL';
    sortBy = 'newest';
    mitraId = '';
    loadProducts(1);
  }

  function formatPrice(val: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }
</script>

<svelte:head>
  <title>Katalog Produk UMKM - Lokal Warung</title>
  <meta name="description" content="Katalog produk lokal warung & UMKM terpercaya. Cari dan temukan berbagai kebutuhan langsung dari produsen lokal." />
</svelte:head>

<div class="container">
  <div class="catalog-header">
    <h1>Katalog Produk Lokal</h1>
    <p>Temukan produk langsung dari mitra dan pelaku UMKM terpercaya.</p>
  </div>

  <!-- SEARCH & FILTER TOOLBAR -->
  <div class="filter-panel">
    <div class="search-row">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Ketik nama produk atau kata kunci..." 
          bind:value={searchQuery}
          on:input={handleSearchInput}
        />
        {#if searchQuery}
          <button type="button" class="clear-btn" on:click={() => { searchQuery = ''; loadProducts(1); }}>✕</button>
        {/if}
      </div>

      <div class="sort-select-wrapper">
        <label for="sort-select" class="visually-hidden">Urutkan</label>
        <select id="sort-select" bind:value={sortBy} on:change={handleFilterChange}>
          <option value="newest">Terbaru</option>
          <option value="price_asc">Harga: Terendah &rarr; Tertinggi</option>
          <option value="price_desc">Harga: Tertinggi &rarr; Terendah</option>
          <option value="popular">Terpopuler</option>
        </select>
      </div>
    </div>

    <!-- FILTER CHIPS & CONTROLS -->
    <div class="filter-controls-row">
      <div class="control-group">
        <label for="category-select">Kategori:</label>
        <select id="category-select" bind:value={selectedCategory} on:change={handleFilterChange}>
          {#each categories as c}
            <option value={c.value}>{c.label}</option>
          {/each}
        </select>
      </div>

      <div class="control-group">
        <label for="avail-select">Ketersediaan:</label>
        <select id="avail-select" bind:value={availability} on:change={handleFilterChange}>
          <option value="ALL">Semua</option>
          <option value="AVAILABLE">Tersedia Saja</option>
          <option value="OUT_OF_STOCK">Habis</option>
        </select>
      </div>

      <div class="control-group price-range-group">
        <label for="min-price">Harga Min:</label>
        <input id="min-price" type="number" placeholder="Rp Min" bind:value={minPrice} on:change={handleFilterChange} />
        <label for="max-price">Maks:</label>
        <input id="max-price" type="number" placeholder="Rp Maks" bind:value={maxPrice} on:change={handleFilterChange} />
      </div>

      <button type="button" class="reset-btn" on:click={resetFilters}>Reset Filter</button>
    </div>
  </div>

  <!-- PRODUCTS GRID OR EMPTY STATE -->
  <div class="results-info">
    <span>Menampilkan <strong>{products.length}</strong> dari <strong>{totalItems}</strong> produk</span>
    {#if mitraId}
      <span class="active-filter-badge">Filter Toko Aktif <button type="button" on:click={() => { mitraId = ''; loadProducts(1); }}>✕</button></span>
    {/if}
  </div>

  {#if loading}
    <div class="skeleton-grid">
      {#each Array(6) as _}
        <div class="skeleton-card"></div>
      {/each}
    </div>
  {:else if products.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>Tidak Ada Produk yang Ditemukan</h3>
      <p>Coba gunakan kata kunci lain atau ubah pengaturan filter pencarian Anda.</p>
      <Button on:click={resetFilters}>Lihat Semua Produk</Button>
    </div>
  {:else}
    <div class="grid">
      {#each products as p}
        <a href={`/products/${p.id}`} class="product-card-link">
          <Card>
            <div class="image-wrapper">
              {#if p.image}
                <img src={p.image} alt={p.name} class="product-image" loading="lazy" />
              {:else}
                <div class="image-placeholder">
                  <span>Foto Belum Tersedia</span>
                </div>
              {/if}
              <span class={`status-badge ${p.availability === 'AVAILABLE' ? 'avail' : 'out'}`}>
                {p.availability === 'AVAILABLE' ? 'Tersedia' : 'Habis'}
              </span>
            </div>

            <div class="card-body">
              {#if p.category}
                <span class="category-pill">{p.category}</span>
              {/if}
              <h3 class="product-title">{p.name}</h3>
              <div class="price">{formatPrice(p.price)}</div>
              
              {#if p.mitraName}
                <div class="store-info">
                  🏪 <strong>{p.mitraName}</strong>
                  {#if p.city} • <span class="city">{p.city}</span>{/if}
                </div>
              {/if}
            </div>
          </Card>
        </a>
      {/each}
    </div>

    <!-- PAGINATION CONTROLS -->
    {#if totalPages > 1}
      <div class="pagination">
        <button 
          type="button" 
          class="page-btn" 
          disabled={page <= 1} 
          on:click={() => loadProducts(page - 1)}
        >
          &larr; Sebelumnya
        </button>
        
        <span class="page-indicator">Halaman {page} dari {totalPages}</span>
        
        <button 
          type="button" 
          class="page-btn" 
          disabled={page >= totalPages} 
          on:click={() => loadProducts(page + 1)}
        >
          Berikutnya &rarr;
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 2rem auto 5rem;
    padding: 0 1rem;
  }
  .catalog-header {
    margin-bottom: 2rem;
  }
  .catalog-header h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 0.5rem;
  }
  .catalog-header p {
    color: #64748b;
    margin: 0;
    font-size: 1rem;
  }
  .filter-panel {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .search-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .search-input-wrapper {
    flex: 1;
    min-width: 250px;
    display: flex;
    align-items: center;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    background: #f8fafc;
  }
  .search-icon {
    margin-right: 0.5rem;
  }
  .search-input-wrapper input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.875rem;
    color: #1e293b;
  }
  .clear-btn {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
  }
  .sort-select-wrapper select, .control-group select, .price-range-group input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
    color: #334155;
    outline: none;
  }
  .filter-controls-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid #f1f5f9;
  }
  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: #475569;
  }
  .price-range-group input {
    width: 90px;
  }
  .reset-btn {
    background: none;
    border: none;
    color: #0284c7;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    margin-left: auto;
  }
  .results-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1.25rem;
  }
  .active-filter-badge {
    background: #e0f2fe;
    color: #0369a1;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .active-filter-badge button {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 0.75rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  .product-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
    height: 100%;
  }
  .image-wrapper {
    position: relative;
    width: 100%;
    height: 180px;
    background: #f1f5f9;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    overflow: hidden;
  }
  .product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 0.8125rem;
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
  .card-body {
    padding: 1rem;
  }
  .category-pill {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #0369a1;
    background: #f0f9ff;
    padding: 0.15rem 0.45rem;
    border-radius: 0.25rem;
    display: inline-block;
    margin-bottom: 0.4rem;
  }
  .product-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.4rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .price {
    font-size: 1.125rem;
    font-weight: 700;
    color: #0284c7;
    margin-bottom: 0.5rem;
  }
  .store-info {
    font-size: 0.75rem;
    color: #64748b;
    border-top: 1px solid #f1f5f9;
    padding-top: 0.5rem;
  }
  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
    background: white;
    border: 1px dashed #cbd5e1;
    border-radius: 0.75rem;
  }
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  .empty-state h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem;
  }
  .empty-state p {
    color: #64748b;
    margin: 0 0 1.5rem;
  }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 3rem;
  }
  .page-btn {
    background: white;
    border: 1px solid #cbd5e1;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
  }
  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .page-indicator {
    font-size: 0.875rem;
    color: #64748b;
  }
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  .skeleton-card {
    height: 280px;
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 0.5rem;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
