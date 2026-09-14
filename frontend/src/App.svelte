<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Router, Route, links } from 'svelte-routing';
  import Navbar from './lib/components/Navbar.svelte';
  import Home from './routes/Home.svelte';
  import Login from './routes/Login.svelte';
  import Products from './routes/Products.svelte';
  import ProductDetail from './routes/ProductDetail.svelte';
  import Profile from './routes/Profile.svelte';
  import MitraPublic from './routes/MitraPublic.svelte';
  import PartnershipPublic from './routes/PartnershipPublic.svelte';
  import PartnershipDetail from './routes/PartnershipDetail.svelte';
  import MitraDashboard from './routes/MitraDashboard.svelte';
  import PartnershipDashboard from './routes/PartnershipDashboard.svelte';
  import Admin from './routes/Admin.svelte';

  export let url = '';

  let isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  let reconnectedToast = false;

  function handleOnline() {
    isOffline = false;
    reconnectedToast = true;
    setTimeout(() => {
      reconnectedToast = false;
    }, 4000);
  }

  function handleOffline() {
    isOffline = true;
    reconnectedToast = false;
  }

  onMount(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  });
</script>

<Router {url}>
  {#if isOffline}
    <div class="offline-banner">
      <span>⚠️ <b>Mode Offline:</b> Menampilkan data yang tersimpan. Hubungkan ke jaringan untuk memperbarui data produk & mitra.</span>
    </div>
  {/if}
  {#if reconnectedToast}
    <div class="reconnected-banner">
      <span>✓ Terhubung kembali ke jaringan internet.</span>
    </div>
  {/if}

  <Navbar />
  <main class="container" use:links>
    <div style="padding-top: 1.5rem; padding-bottom: 3rem;">
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" let:params>
        <ProductDetail id={params.id} />
      </Route>
      <Route path="/profile" component={Profile} />
      <Route path="/partnerships" component={PartnershipPublic} />
      <Route path="/partnerships/:id" let:params>
        <PartnershipDetail id={params.id} />
      </Route>
      <Route path="/mitra-dashboard" component={MitraDashboard} />
      <Route path="/partnership-dashboard" component={PartnershipDashboard} />
      <Route path="/mitra/:id" let:params>
        <MitraPublic id={params.id} />
      </Route>
      <Route path="/admin" component={Admin} />
    </div>
  </main>
</Router>

<style>
  .offline-banner {
    background: #fef3c7;
    color: #92400e;
    border-bottom: 1px solid #fde68a;
    padding: 0.65rem 1rem;
    text-align: center;
    font-size: 0.875rem;
  }
  .reconnected-banner {
    background: #d1fae5;
    color: #065f46;
    border-bottom: 1px solid #a7f3d0;
    padding: 0.65rem 1rem;
    text-align: center;
    font-size: 0.875rem;
  }
</style>
