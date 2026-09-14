<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';

  let mitraProfile: any = null;
  let loading = true;
  let saving = false;
  let successMsg = '';
  let errorMsg = '';

  // Form Fields
  let businessName = '';
  let category = '';
  let shortDescription = '';
  let description = '';
  let phone = '';
  let address = '';
  let city = '';
  let contactLabel = '';
  let contactUrl = '';
  let isPublic = false;
  let timezone = 'Asia/Jakarta';

  let logoUrl = '';
  let coverUrl = '';

  interface DaySchedule {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }

  const daysList = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' }
  ];

  let operatingHours: Record<string, DaySchedule> = {
    monday: { isOpen: true, openTime: '08:00', closeTime: '21:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '21:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '21:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '21:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '21:00' },
    saturday: { isOpen: true, openTime: '08:00', closeTime: '22:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '17:00' }
  };

  onMount(async () => {
    try {
      const res = await api.get('/mitra/me');
      if (res.data) {
        mitraProfile = res.data;
        populateForm(res.data);
      }
    } catch (e: any) {
      if (e.status === 404) {
        mitraProfile = null;
      } else {
        errorMsg = 'Gagal memuat profil Mitra.';
      }
    } finally {
      loading = false;
    }
  });

  function populateForm(data: any) {
    businessName = data.businessName || '';
    category = data.category || '';
    shortDescription = data.shortDescription || '';
    description = data.description || '';
    phone = data.phone || '';
    address = data.address || '';
    city = data.city || '';
    contactLabel = data.contactLabel || '';
    contactUrl = data.contactUrl || '';
    isPublic = data.isPublic ?? false;
    logoUrl = data.logo || '';
    coverUrl = data.coverImage || '';
    timezone = data.timezone || 'Asia/Jakarta';

    if (data.operatingHours) {
      try {
        const parsed = typeof data.operatingHours === 'string' ? JSON.parse(data.operatingHours) : data.operatingHours;
        operatingHours = { ...operatingHours, ...parsed };
      } catch (e) {
        console.error('Failed to parse operating hours', e);
      }
    }
  }

  async function handleSave() {
    saving = true;
    successMsg = '';
    errorMsg = '';
    
    // Basic CTA validation
    if (contactUrl && !contactUrl.match(/^(https?|tel|mailto):/)) {
      errorMsg = 'URL kontak harus diawali dengan http://, https://, tel:, atau mailto:';
      saving = false;
      return;
    }

    try {
      const payload = {
        businessName,
        category,
        shortDescription,
        description,
        phone,
        address,
        city,
        contactLabel,
        contactUrl,
        isPublic,
        timezone,
        operatingHours: JSON.stringify(operatingHours),
        logo: logoUrl,
        coverImage: coverUrl
      };

      let res;
      if (mitraProfile) {
        res = await api.put(`/mitra/${mitraProfile.id}`, payload);
      } else {
        res = await api.post('/mitra', payload);
      }
      
      mitraProfile = res.data;
      successMsg = 'Profil Mitra dan jam operasional berhasil disimpan.';
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal menyimpan profil Mitra.';
    } finally {
      saving = false;
    }
  }

  async function uploadImage(e: Event, type: 'logo' | 'cover') {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorMsg = 'Hanya file gambar yang diperbolehkan.';
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const authCookie = document.cookie.split('auth=')[1]?.split(';')[0];
      const res = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        headers: authCookie ? { 'Authorization': `Bearer ${authCookie}` } : {},
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'logo') logoUrl = data.data.url;
        if (type === 'cover') coverUrl = data.data.url;
      } else {
        errorMsg = data.error?.message || 'Gagal mengupload gambar.';
      }
    } catch (err: any) {
      errorMsg = 'Terjadi kesalahan saat mengupload gambar.';
    }
  }
</script>

<svelte:head>
  <title>Dashboard Mitra - Kelola Toko & Jam Operasional</title>
</svelte:head>

<div class="container">
  <div class="header">
    <h1>Dashboard Toko Mitra</h1>
    <p>Kelola profil bisnis, jam operasional, kontak, dan showcase publik Anda.</p>
  </div>
  
  {#if loading}
    <p>Memuat profil...</p>
  {:else}
    <Card>
      <form on:submit|preventDefault={handleSave}>
        <h2>1. Informasi Bisnis</h2>
        <div class="grid-2">
          <Input label="Nama Bisnis / Warung" bind:value={businessName} required />
          <Input label="Kategori" bind:value={category} required placeholder="Contoh: Kuliner, Sembako, Kopi" />
        </div>
        
        <Input label="Deskripsi Singkat (Tampil di Card Showcase)" bind:value={shortDescription} required />
        <Input label="Deskripsi Lengkap Usaha" bind:value={description} type="textarea" />
        
        <div class="grid-2">
          <Input label="Telepon / WhatsApp" bind:value={phone} />
          <Input label="Kota / Kabupaten" bind:value={city} />
        </div>
        <Input label="Alamat Lengkap Usaha" bind:value={address} type="textarea" />

        <h2 class="mt-4">2. Jam Operasional (S2B.5)</h2>
        <p class="help-text">Atur jadwal operasional per hari untuk menentukan status BUKA/TUTUP secara otomatis.</p>
        
        <div class="form-group mb-3">
          <label for="tz-select" class="tz-label">Zona Waktu Bisnis:</label>
          <select id="tz-select" bind:value={timezone} class="select-input">
            <option value="Asia/Jakarta">WIB (Asia/Jakarta - UTC+7)</option>
            <option value="Asia/Makassar">WITA (Asia/Makassar - UTC+8)</option>
            <option value="Asia/Jayapura">WIT (Asia/Jayapura - UTC+9)</option>
          </select>
        </div>

        <div class="hours-table">
          {#each daysList as day}
            <div class="hours-row">
              <div class="day-col">
                <label class="toggle-switch">
                  <input type="checkbox" bind:checked={operatingHours[day.key].isOpen} />
                  <span class="day-name">{day.label}</span>
                </label>
              </div>
              <div class="time-col">
                {#if operatingHours[day.key].isOpen}
                  <span class="time-inputs">
                    <input type="time" bind:value={operatingHours[day.key].openTime} class="time-input" required />
                    <span class="time-sep">s/d</span>
                    <input type="time" bind:value={operatingHours[day.key].closeTime} class="time-input" required />
                  </span>
                {:else}
                  <span class="closed-tag">TUTUP</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <h2 class="mt-4">3. Call to Action (CTA) & Kontak (S2B.10)</h2>
        <p class="help-text">Tombol kontak yang akan digunakan pengunjung untuk menghubungi warung/toko Anda.</p>
        <div class="grid-2">
          <Input label="Label Tombol CTA (contoh: Pesan via WhatsApp, Hubungi Kami)" bind:value={contactLabel} />
          <Input label="Link URL CTA (contoh: https://wa.me/628123456789 atau tel:+62812...)" bind:value={contactUrl} />
        </div>

        <h2 class="mt-4">4. Foto Profil & Banner (S2B.7)</h2>
        <div class="grid-2">
          <div class="image-upload">
            <label for="logo-input">Logo Mitra</label>
            {#if logoUrl}
              <img src={logoUrl} alt="Logo" class="preview-logo" />
            {/if}
            <input id="logo-input" type="file" accept="image/*" on:change={(e) => uploadImage(e, 'logo')} />
          </div>
          
          <div class="image-upload">
            <label for="cover-input">Banner / Foto Toko</label>
            {#if coverUrl}
              <img src={coverUrl} alt="Cover" class="preview-cover" />
            {/if}
            <input id="cover-input" type="file" accept="image/*" on:change={(e) => uploadImage(e, 'cover')} />
          </div>
        </div>

        <div class="checkbox-wrapper mt-4">
          <label>
            <input type="checkbox" bind:checked={isPublic} />
            Publikasikan profil toko ini di halaman publik (Pencarian & Showcase Mitra)
          </label>
        </div>

        {#if successMsg}
          <div class="success-banner mt-4">{successMsg}</div>
        {/if}
        {#if errorMsg}
          <div class="error-banner mt-4">{errorMsg}</div>
        {/if}

        <div class="actions mt-4">
          <Button type="submit" loading={saving}>Simpan Pengaturan Mitra</Button>
        </div>
      </form>
    </Card>
  {/if}
</div>

<style>
  .container { max-width: 860px; margin: 0 auto; padding: 2rem 1rem; }
  .header { margin-bottom: 2rem; }
  .header h1 { font-size: 2rem; font-weight: 800; color: #111827; margin-bottom: 0.5rem; }
  .header p { color: #6b7280; font-size: 1rem; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .mt-4 { margin-top: 1.75rem; }
  .mb-3 { margin-bottom: 1rem; }
  .help-text { font-size: 0.875rem; color: #6b7280; margin-bottom: 1rem; }
  
  .tz-label { display: block; font-weight: 600; font-size: 0.875rem; color: #374151; margin-bottom: 0.25rem; }
  .select-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.95rem;
    background: #ffffff;
    color: #111827;
  }

  .hours-table {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: #fafafa;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  .hours-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .hours-row:last-child {
    border-bottom: none;
  }
  .day-col {
    display: flex;
    align-items: center;
    width: 140px;
  }
  .toggle-switch {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .day-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
  }
  .time-col {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }
  .time-inputs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .time-input {
    padding: 0.4rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: #ffffff;
    color: #111827;
  }
  .time-sep {
    font-size: 0.85rem;
    color: #6b7280;
  }
  .closed-tag {
    font-size: 0.8rem;
    font-weight: 700;
    color: #9ca3af;
    background: #f3f4f6;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
  }

  .image-upload { border: 1px dashed #d1d5db; padding: 1rem; border-radius: 0.5rem; background: #ffffff; }
  .image-upload label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151; }
  .preview-logo { width: 100px; height: 100px; object-fit: cover; border-radius: 50%; margin-bottom: 1rem; border: 1px solid #e5e7eb; }
  .preview-cover { width: 100%; height: 120px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; }
  .checkbox-wrapper { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #1f2937; }
  .actions { display: flex; justify-content: flex-end; }
  .success-banner { background: #d1fae5; color: #065f46; padding: 1rem; border-radius: 0.375rem; font-weight: 500; }
  .error-banner { background: #fee2e2; color: #b91c1c; padding: 1rem; border-radius: 0.375rem; font-weight: 500; }

  @media (max-width: 640px) {
    .grid-2 { grid-template-columns: 1fr; }
    .hours-row { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .time-col { justify-content: flex-start; width: 100%; }
  }
</style>
