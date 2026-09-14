<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';

  let partnerships: any[] = [];
  let loading = true;
  let editingId: string | null = null;
  let form: any = {};
  let errorMsg = '';
  let successMsg = '';

  onMount(async () => {
    await fetchPartnerships();
  });

  async function fetchPartnerships() {
    try {
      // Assuming GET /partnerships returns partnerships where user is requester or partner
      const res = await api.get('/partnerships');
      partnerships = res.data;
    } catch (e: any) {
      errorMsg = 'Gagal memuat partnerships.';
    } finally {
      loading = false;
    }
  }

  function startEdit(p: any) {
    editingId = p.id;
    form = { ...p };
    errorMsg = '';
    successMsg = '';
  }

  function cancelEdit() {
    editingId = null;
    form = {};
  }

  async function handleSave() {
    errorMsg = '';
    successMsg = '';
    if (form.contactUrl && !form.contactUrl.match(/^(https?|tel|mailto):/)) {
      errorMsg = 'Contact URL must start with http://, https://, tel:, or mailto:';
      return;
    }
    
    try {
      await api.put(`/partnerships/${editingId}`, {
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        contactLabel: form.contactLabel,
        contactUrl: form.contactUrl,
        image: form.image,
        isPublic: form.isPublic
      });
      successMsg = 'Berhasil memperbarui partnership.';
      editingId = null;
      await fetchPartnerships();
    } catch (e: any) {
      errorMsg = e.error?.message || 'Gagal menyimpan.';
    }
  }

  async function uploadImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorMsg = 'Hanya file gambar yang diperbolehkan.';
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '') + '/upload';
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${document.cookie.split('auth=')[1]}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        form.image = data.data.url;
      } else {
        errorMsg = data.error?.message || 'Gagal mengupload gambar.';
      }
    } catch (err: any) {
      errorMsg = 'Terjadi kesalahan saat mengupload.';
    }
  }
</script>

<div class="container">
  <h1>Manajemen Partnership</h1>
  
  {#if loading}
    <p>Memuat data...</p>
  {:else}
    {#if errorMsg}
      <div class="error-banner mb-4">{errorMsg}</div>
    {/if}
    {#if successMsg}
      <div class="success-banner mb-4">{successMsg}</div>
    {/if}

    <div class="grid">
      {#each partnerships as p}
        <Card>
          {#if editingId === p.id}
            <form on:submit|preventDefault={handleSave}>
              <Input label="Judul Partnership" bind:value={form.title} required />
              <Input label="Deskripsi Singkat" bind:value={form.shortDescription} />
              <Input label="Deskripsi Lengkap" bind:value={form.description} type="textarea" />
              
              <div class="grid-2">
                <Input label="Contact Label" bind:value={form.contactLabel} />
                <Input label="Contact URL" bind:value={form.contactUrl} />
              </div>
              
              <div class="image-upload mt-2">
                <label for="partnership-image-input">Partnership Image</label>
                {#if form.image}
                  <img src={form.image} alt="Preview" class="preview-img" />
                {/if}
                <input id="partnership-image-input" type="file" accept="image/*" on:change={uploadImage} />
              </div>
              
              <div class="mt-2">
                <label>
                  <input type="checkbox" bind:checked={form.isPublic} /> Publikasikan
                </label>
              </div>
              
              <div class="actions mt-4">
                <Button variant="secondary" on:click={cancelEdit} type="button">Batal</Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          {:else}
            <div class="card-content">
              <h3>{p.title}</h3>
              <p class="status">Status: {p.status}</p>
              <p class="status">Visibility: {p.isPublic ? 'Public' : 'Private'}</p>
              {#if p.image}
                <img src={p.image} alt="Partnership" class="preview-img mt-2" />
              {/if}
              <div class="actions mt-4">
                <Button on:click={() => startEdit(p)}>Edit Konten</Button>
              </div>
            </div>
          {/if}
        </Card>
      {/each}
      {#if partnerships.length === 0}
        <p>Anda belum memiliki partnership. Ajukan atau tunggu permintaan partnership.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container { max-width: 900px; margin: 0 auto; padding: 2rem 1rem; }
  .grid { display: grid; gap: 1.5rem; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1.5rem; }
  .mb-4 { margin-bottom: 1.5rem; }
  .card-content { padding: 1rem; }
  .card-content h3 { margin-top: 0; }
  .status { font-size: 0.875rem; color: #4b5563; font-weight: 600; margin-bottom: 0.25rem; }
  .actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .image-upload { border: 1px dashed var(--border); padding: 1rem; border-radius: 0.5rem; }
  .preview-img { width: 100%; height: 150px; object-fit: cover; border-radius: 0.5rem; margin-bottom: 1rem; }
  .success-banner { background: #d1fae5; color: #065f46; padding: 1rem; border-radius: 0.375rem; }
  .error-banner { background: #fee2e2; color: #b91c1c; padding: 1rem; border-radius: 0.375rem; }
</style>
