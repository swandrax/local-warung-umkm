<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Input from '../lib/components/Input.svelte';
  import Button from '../lib/components/Button.svelte';

  let profile: any = null;
  let user: any = null;
  let loading = true;
  let saving = false;
  let successMsg = '';
  let errorMsg = '';

  let name = '';
  let phone = '';
  let address = '';
  let city = '';
  let bio = '';

  onMount(async () => {
    try {
      const res = await api.get('/auth/me');
      user = res.data.user;
      profile = res.data.profile;
      
      name = profile.name || '';
      phone = profile.phone || '';
      address = profile.address || '';
      city = profile.city || '';
      bio = profile.bio || '';
    } catch (e) {
      navigate('/login');
    } finally {
      loading = false;
    }
  });

  async function handleSave() {
    saving = true;
    successMsg = '';
    errorMsg = '';
    try {
      const res = await api.put('/profile', { name, phone, address, city, bio });
      profile = res.data;
      successMsg = 'Profile updated successfully!';
    } catch (e: any) {
      errorMsg = e.error?.message || 'Failed to update profile';
    } finally {
      saving = false;
    }
  }
</script>

{#if loading}
  <div class="loading">Loading profile...</div>
{:else if profile}
  <div class="profile-container">
    <Card title="Your Profile">
      <div class="role-badge">Role: {user.role}</div>
      
      <form on:submit|preventDefault={handleSave}>
        <Input label="Email (Read Only)" type="email" value={user.email} disabled />
        <Input label="Name" bind:value={name} required />
        <div class="grid-2">
          <Input label="Phone" bind:value={phone} />
          <Input label="City" bind:value={city} />
        </div>
        <Input label="Address" bind:value={address} type="textarea" />
        <Input label="Bio" bind:value={bio} type="textarea" />

        {#if successMsg}
          <div class="success-banner">{successMsg}</div>
        {/if}
        {#if errorMsg}
          <div class="error-banner">{errorMsg}</div>
        {/if}

        <div class="actions">
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </Card>
  </div>
{/if}

<style>
  .profile-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .role-badge {
    display: inline-block;
    background-color: var(--primary);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }

  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .success-banner {
    background-color: #d1fae5;
    color: #065f46;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .error-banner {
    background-color: #fee2e2;
    color: #b91c1c;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
</style>
