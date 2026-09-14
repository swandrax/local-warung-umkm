<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';

  let activeTab: 'moderation' | 'analytics' | 'audit' = 'moderation';
  let loading = true;
  let errorMsg = '';
  let successMsg = '';

  // Moderation state
  let pendingData: { products: any[]; mitras: any[]; partnerships: any[] } = {
    products: [],
    mitras: [],
    partnerships: []
  };
  let rejectReason = '';
  let rejectingEntity: { type: string; id: string; name: string } | null = null;
  let actionLoading = false;

  // Analytics state
  let analytics: any = null;
  let analyticsLoading = false;

  // Audit state
  let auditLogs: any[] = [];
  let auditLoading = false;

  onMount(async () => {
    await loadPendingModeration();
  });

  async function loadPendingModeration() {
    loading = true;
    errorMsg = '';
    try {
      const res = await api.get('/admin/pending');
      pendingData = res.data || { products: [], mitras: [], partnerships: [] };
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal memuat daftar moderasi. Pastikan Anda login sebagai Admin.';
    } finally {
      loading = false;
    }
  }

  async function loadAnalytics() {
    analyticsLoading = true;
    try {
      const res = await api.get('/admin/analytics/summary');
      analytics = res.data;
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal memuat analitik.';
    } finally {
      analyticsLoading = false;
    }
  }

  async function loadAuditLogs() {
    auditLoading = true;
    try {
      const res = await api.get('/admin/audit-logs');
      auditLogs = res.data || [];
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal memuat audit log.';
    } finally {
      auditLoading = false;
    }
  }

  function switchTab(tab: 'moderation' | 'analytics' | 'audit') {
    activeTab = tab;
    errorMsg = '';
    successMsg = '';
    if (tab === 'moderation') loadPendingModeration();
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'audit') loadAuditLogs();
  }

  async function handleModerate(entityType: string, id: string, action: 'APPROVE' | 'REJECT' | 'ARCHIVE', reason?: string) {
    if (action === 'REJECT' && (!reason || reason.trim() === '')) {
      alert('Alasan penolakan (reason) wajib diisi untuk action REJECT.');
      return;
    }

    actionLoading = true;
    errorMsg = '';
    successMsg = '';

    try {
      const res = await api.post(`/admin/moderate/${entityType}/${id}`, {
        action,
        reason: reason || undefined
      });
      successMsg = res.message || `Berhasil melakukan moderasi: ${action}`;
      rejectingEntity = null;
      rejectReason = '';
      await loadPendingModeration();
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal melakukan aksi moderasi.';
    } finally {
      actionLoading = false;
    }
  }

  function openRejectModal(type: string, id: string, name: string) {
    rejectingEntity = { type, id, name };
    rejectReason = '';
  }
</script>

<svelte:head>
  <title>Admin Dashboard & Moderasi - Local Warung</title>
</svelte:head>

<div class="admin-container">
  <div class="admin-header">
    <div>
      <h1>Platform Moderation & Admin Control</h1>
      <p>Pusat kendali persetujuan konten publik, analytics konversi, dan audit keamanan.</p>
    </div>
  </div>

  <!-- Tabs Navigation -->
  <div class="tabs-bar">
    <button 
      class="tab-btn {activeTab === 'moderation' ? 'active' : ''}" 
      on:click={() => switchTab('moderation')}
    >
      🛡️ Moderasi Konten
      {#if (pendingData.products.length + pendingData.mitras.length + pendingData.partnerships.length) > 0}
        <span class="badge-count">
          {pendingData.products.length + pendingData.mitras.length + pendingData.partnerships.length}
        </span>
      {/if}
    </button>
    <button 
      class="tab-btn {activeTab === 'analytics' ? 'active' : ''}" 
      on:click={() => switchTab('analytics')}
    >
      📈 Analytics & Konversi (S2B.14)
    </button>
    <button 
      class="tab-btn {activeTab === 'audit' ? 'active' : ''}" 
      on:click={() => switchTab('audit')}
    >
      🔒 Audit Log Keamanan (RBAC)
    </button>
  </div>

  {#if successMsg}
    <div class="alert-banner success">{successMsg}</div>
  {/if}
  {#if errorMsg}
    <div class="alert-banner error">{errorMsg}</div>
  {/if}

  <!-- TAB 1: MODERATION -->
  {#if activeTab === 'moderation'}
    {#if loading}
      <div class="loading-box">Memeriksa antrean moderasi...</div>
    {:else}
      <!-- Products Moderation -->
      <section class="section-card">
        <div class="section-title-row">
          <h2>Produk Menunggu Review ({pendingData.products.length})</h2>
        </div>
        {#if pendingData.products.length === 0}
          <p class="empty-text">Tidak ada produk dalam antrean review saat ini.</p>
        {:else}
          <div class="item-list">
            {#each pendingData.products as prod}
              <div class="mod-item">
                <div class="item-thumb-wrapper">
                  {#if prod.image}
                    <img src={prod.image} alt={prod.name} class="item-thumb" />
                  {:else}
                    <div class="item-thumb-placeholder">Produk</div>
                  {/if}
                </div>
                <div class="item-details">
                  <div class="item-header">
                    <h3>{prod.name}</h3>
                    <span class="price-tag">Rp {Number(prod.price).toLocaleString('id-ID')}</span>
                  </div>
                  <p class="item-meta">Mitra ID: <code>{prod.mitraId}</code> | Kategori: {prod.category || 'Umum'} | Status: <b>{prod.status}</b></p>
                  {#if prod.description}
                    <p class="item-desc">{prod.description}</p>
                  {/if}
                </div>
                <div class="item-actions">
                  <button 
                    class="btn-action approve" 
                    disabled={actionLoading}
                    on:click={() => handleModerate('products', prod.id, 'APPROVE')}
                  >
                    ✓ Publish
                  </button>
                  <button 
                    class="btn-action reject" 
                    disabled={actionLoading}
                    on:click={() => openRejectModal('products', prod.id, prod.name)}
                  >
                    ✕ Reject
                  </button>
                  <button 
                    class="btn-action archive" 
                    disabled={actionLoading}
                    on:click={() => handleModerate('products', prod.id, 'ARCHIVE')}
                  >
                    Arsipkan
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Mitra Moderation -->
      <section class="section-card mt-4">
        <div class="section-title-row">
          <h2>Mitra / Toko Menunggu Review ({pendingData.mitras.length})</h2>
        </div>
        {#if pendingData.mitras.length === 0}
          <p class="empty-text">Tidak ada toko mitra dalam antrean review saat ini.</p>
        {:else}
          <div class="item-list">
            {#each pendingData.mitras as mitra}
              <div class="mod-item">
                <div class="item-thumb-wrapper">
                  {#if mitra.logo}
                    <img src={mitra.logo} alt={mitra.businessName} class="item-thumb round" />
                  {:else}
                    <div class="item-thumb-placeholder round">{mitra.businessName.charAt(0)}</div>
                  {/if}
                </div>
                <div class="item-details">
                  <div class="item-header">
                    <h3>{mitra.businessName}</h3>
                    <span class="loc-tag">📍 {mitra.city || 'Belum diisi'}</span>
                  </div>
                  <p class="item-meta">Kategori: {mitra.category || 'Umum'} | Kontak: {mitra.phone || '-'}</p>
                  {#if mitra.shortDescription}
                    <p class="item-desc">{mitra.shortDescription}</p>
                  {/if}
                </div>
                <div class="item-actions">
                  <button 
                    class="btn-action approve" 
                    disabled={actionLoading}
                    on:click={() => handleModerate('mitra', mitra.id, 'APPROVE')}
                  >
                    ✓ Approve Toko
                  </button>
                  <button 
                    class="btn-action reject" 
                    disabled={actionLoading}
                    on:click={() => openRejectModal('mitra', mitra.id, mitra.businessName)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Partnership Moderation -->
      <section class="section-card mt-4">
        <div class="section-title-row">
          <h2>Partnership Menunggu Review ({pendingData.partnerships.length})</h2>
        </div>
        {#if pendingData.partnerships.length === 0}
          <p class="empty-text">Tidak ada program kemitraan dalam antrean review saat ini.</p>
        {:else}
          <div class="item-list">
            {#each pendingData.partnerships as p}
              <div class="mod-item">
                <div class="item-details">
                  <div class="item-header">
                    <h3>{p.title}</h3>
                  </div>
                  <p class="item-meta">Partner Mitra ID: <code>{p.partnerId}</code></p>
                  {#if p.shortDescription}
                    <p class="item-desc">{p.shortDescription}</p>
                  {/if}
                </div>
                <div class="item-actions">
                  <button 
                    class="btn-action approve" 
                    disabled={actionLoading}
                    on:click={() => handleModerate('partnerships', p.id, 'APPROVE')}
                  >
                    ✓ Publish Partnership
                  </button>
                  <button 
                    class="btn-action reject" 
                    disabled={actionLoading}
                    on:click={() => openRejectModal('partnerships', p.id, p.title)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  {/if}

  <!-- TAB 2: ANALYTICS & CONVERSION -->
  {#if activeTab === 'analytics'}
    {#if analyticsLoading}
      <div class="loading-box">Menghitung metrik analitik...</div>
    {:else if analytics}
      <div class="analytics-overview">
        <!-- Event Counters Grid -->
        <div class="metric-grid">
          <div class="metric-card">
            <span class="m-label">Product Views</span>
            <span class="m-value">{analytics.events?.productViews ?? 0}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Mitra Views</span>
            <span class="m-value">{analytics.events?.mitraViews ?? 0}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Partnership Views</span>
            <span class="m-value">{analytics.events?.partnershipViews ?? 0}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Total Searches</span>
            <span class="m-value">{analytics.events?.searches ?? 0}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Contact Clicks</span>
            <span class="m-value">{analytics.events?.contactClicks ?? 0}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">CTA Clicks</span>
            <span class="m-value">{analytics.events?.ctaClicks ?? 0}</span>
          </div>
        </div>

        <!-- Formulas & Conversion Rates -->
        <div class="ctr-row mt-4">
          <div class="ctr-card primary">
            <h3>CTR Kontak Langsung (CTR Contact)</h3>
            <p class="formula-desc">
              $$CTR_&#123;contact&#125; = \frac&#123;\text&#123;ContactClicks&#125;&#125;&#123;\text&#123;ProductViews + MitraViews&#125;&#125;$$
            </p>
            <div class="ctr-value">{analytics.rates?.ctrContact ?? '0.00%'}</div>
            <p class="ctr-sub">Mengukur efektivitas pengunjung toko beralih ke kontak WhatsApp / Telepon.</p>
          </div>

          <div class="ctr-card secondary">
            <h3>CTR Aksi Ajuan Kemitraan (CTR CTA)</h3>
            <p class="formula-desc">
              $$CTR_&#123;CTA&#125; = \frac&#123;\text&#123;CTAClicks&#125;&#125;&#123;\text&#123;TotalRelevantPageViews&#125;&#125;$$
            </p>
            <div class="ctr-value">{analytics.rates?.ctrCta ?? '0.00%'}</div>
            <p class="ctr-sub">Mengukur minat pengunjung mengajukan kemitraan B2B.</p>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- TAB 3: AUDIT LOGS -->
  {#if activeTab === 'audit'}
    {#if auditLoading}
      <div class="loading-box">Mengambil riwayat audit log...</div>
    {:else}
      <section class="section-card">
        <h2>Riwayat Audit Keamanan & RBAC</h2>
        {#if auditLogs.length === 0}
          <p class="empty-text">Belum ada riwayat aktivitas yang tercatat.</p>
        {:else}
          <table class="audit-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User ID</th>
                <th>Aksi</th>
                <th>Resource</th>
                <th>Resource ID</th>
              </tr>
            </thead>
            <tbody>
              {#each auditLogs as log}
                <tr>
                  <td>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
                  <td><code>{log.userId}</code></td>
                  <td><span class="action-tag">{log.action}</span></td>
                  <td>{log.resource}</td>
                  <td><code>{log.resourceId}</code></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </section>
    {/if}
  {/if}
</div>

<!-- Reject Reason Modal -->
{#if rejectingEntity}
  <div class="modal-backdrop">
    <div class="modal-card">
      <h3>Tolak Konten: {rejectingEntity.name}</h3>
      <p class="modal-subtitle">Berikan alasan penolakan yang jelas agar pemilik dapat memperbaiki kontennya.</p>
      
      <div class="form-group">
        <label for="reject-reason">Alasan Penolakan (Wajib):</label>
        <textarea 
          id="reject-reason" 
          bind:value={rejectReason} 
          placeholder="Contoh: Foto produk buram atau deskripsi tidak sesuai ketentuan UMKM..."
          rows="4"
        ></textarea>
      </div>

      <div class="modal-actions">
        <button 
          class="btn-cancel" 
          disabled={actionLoading}
          on:click={() => { rejectingEntity = null; rejectReason = ''; }}
        >
          Batal
        </button>
        <button 
          class="btn-reject-confirm" 
          disabled={actionLoading || !rejectReason.trim()}
          on:click={() => {
            if (rejectingEntity) {
              handleModerate(rejectingEntity.type, rejectingEntity.id, 'REJECT', rejectReason);
            }
          }}
        >
          {actionLoading ? 'Menolak...' : 'Konfirmasi Tolak'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .admin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }
  .admin-header {
    margin-bottom: 2rem;
  }
  .admin-header h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #111827;
    margin-bottom: 0.25rem;
  }
  .admin-header p {
    color: #6b7280;
    font-size: 1rem;
  }

  .tabs-bar {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }
  .tab-btn {
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    padding: 0.75rem 1.25rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: #4b5563;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .tab-btn:hover {
    color: #111827;
  }
  .tab-btn.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }
  .badge-count {
    background: #ef4444;
    color: #ffffff;
    font-size: 0.75rem;
    padding: 0.1rem 0.45rem;
    border-radius: 9999px;
  }

  .alert-banner {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }
  .alert-banner.success {
    background: #d1fae5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }
  .alert-banner.error {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .section-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .section-title-row h2 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1rem;
  }
  .mt-4 { margin-top: 1.5rem; }

  .mod-item {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
    background: #fafafa;
  }
  .item-thumb-wrapper {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
  .item-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
  .item-thumb.round { border-radius: 50%; }
  .item-thumb-placeholder {
    width: 100%;
    height: 100%;
    background: #e5e7eb;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    border-radius: 0.375rem;
  }
  .item-thumb-placeholder.round { border-radius: 50%; font-size: 1.2rem; font-weight: 700; }

  .item-details { flex: 1; min-width: 0; }
  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }
  .item-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
  .price-tag {
    font-size: 0.95rem;
    font-weight: 700;
    color: #2563eb;
  }
  .loc-tag {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .item-meta {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 0.35rem;
  }
  .item-desc {
    font-size: 0.875rem;
    color: #4b5563;
    line-height: 1.4;
  }

  .item-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .btn-action {
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
    font-weight: 600;
    border-radius: 0.375rem;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  .btn-action.approve {
    background: #10b981;
    color: #ffffff;
  }
  .btn-action.approve:hover { background: #059669; }
  .btn-action.reject {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fca5a5;
  }
  .btn-action.reject:hover { background: #fecaca; }
  .btn-action.archive {
    background: #f3f4f6;
    color: #4b5563;
    border-color: #d1d5db;
  }
  .btn-action.archive:hover { background: #e5e7eb; color: #111827; }

  /* Metric Grid */
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 1rem;
  }
  .metric-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 1.25rem;
    text-align: center;
  }
  .m-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .m-value {
    font-size: 1.75rem;
    font-weight: 800;
    color: #111827;
  }

  .ctr-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .ctr-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.75rem;
    padding: 1.75rem;
  }
  .ctr-card h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }
  .formula-desc {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 1rem;
  }
  .ctr-value {
    font-size: 2.5rem;
    font-weight: 800;
    color: #2563eb;
    margin-bottom: 0.5rem;
  }
  .ctr-sub {
    font-size: 0.85rem;
    color: #6b7280;
  }

  /* Audit Table */
  .audit-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    font-size: 0.9rem;
  }
  .audit-table th, .audit-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  .audit-table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  .action-tag {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    background: #eff6ff;
    color: #1d4ed8;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }
  .modal-card {
    background: #ffffff;
    border-radius: 0.75rem;
    padding: 1.75rem;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
  }
  .modal-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.25rem;
  }
  .modal-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1.25rem;
  }
  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }
  .form-group textarea {
    width: 100%;
    padding: 0.65rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.9rem;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
  .btn-cancel {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 600;
  }
  .btn-reject-confirm {
    background: #dc2626;
    color: #ffffff;
    border: none;
    padding: 0.5rem 1.25rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 600;
  }
  .btn-reject-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

  .empty-text, .loading-box {
    text-align: center;
    padding: 2.5rem;
    color: #6b7280;
    background: #f9fafb;
    border-radius: 0.5rem;
    margin-top: 0.75rem;
  }

  @media (max-width: 768px) {
    .mod-item { flex-direction: column; align-items: flex-start; }
    .item-actions { width: 100%; justify-content: flex-end; }
    .ctr-row { grid-template-columns: 1fr; }
  }
</style>
