<script lang="ts">
  import { links, navigate } from 'svelte-routing';
  import { onMount } from 'svelte';
  import { api } from '../api';

  let user: any = null;

  onMount(async () => {
    try {
      const res = await api.get('/auth/me');
      user = res.data.user;
    } catch (e) {
      // Not logged in
    }
  });

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
      user = null;
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  }
</script>

<nav class="navbar">
  <div class="container nav-content" use:links>
    <a href="/" class="brand">UMKM Local Warung</a>
    
    <div class="nav-links">
      <a href="/products">Katalog</a>
      <a href="/partnerships">Partnerships</a>
      
      {#if user}
        {#if user.role === 'MITRA'}
          <a href="/mitra-dashboard">Mitra Dashboard</a>
          <a href="/partnership-dashboard">Kelola Partnership</a>
        {/if}
        <a href="/profile">Profile</a>
        {#if user.role === 'ADMIN'}
          <a href="/admin">Admin</a>
        {/if}
        <button class="logout-btn" on:click={handleLogout}>Logout</button>
      {:else}
        <a href="/login" class="login-btn">Login</a>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background-color: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 4rem;
  }

  .brand {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-links a {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .nav-links a:hover {
    color: var(--primary);
    text-decoration: none;
  }

  .login-btn, .logout-btn {
    background-color: var(--primary);
    color: white !important;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
  }

  .login-btn:hover, .logout-btn:hover {
    background-color: var(--primary-hover);
  }
</style>
