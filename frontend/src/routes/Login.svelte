<script lang="ts">
  import { navigate, links } from 'svelte-routing';
  import { api } from '../lib/api';
  import Card from '../lib/components/Card.svelte';
  import Input from '../lib/components/Input.svelte';
  import Button from '../lib/components/Button.svelte';

  let email = '';
  let password = '';
  let name = '';
  let isRegister = false;
  let errorMsg = '';
  let loading = false;

  async function handleSubmit() {
    loading = true;
    errorMsg = '';
    try {
      if (isRegister) {
        await api.post('/auth/register', { email, password, name });
        // Automatically login after register
        await api.post('/auth/login', { email, password });
      } else {
        await api.post('/auth/login', { email, password });
      }
      
      // Redirect to profile or home
      window.location.href = '/profile';
    } catch (e: any) {
      errorMsg = e.error?.message || 'An error occurred';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-container" use:links>
  <Card title={isRegister ? 'Create an Account' : 'Welcome Back'}>
    <form on:submit|preventDefault={handleSubmit}>
      
      {#if isRegister}
        <Input label="Name" bind:value={name} placeholder="Your Name" required />
      {/if}
      
      <Input label="Email" type="email" bind:value={email} placeholder="you@example.com" required />
      <Input label="Password" type="password" bind:value={password} placeholder="••••••••" required />

      {#if errorMsg}
        <div class="error-banner">{errorMsg}</div>
      {/if}

      <div style="margin-top: 1.5rem;">
        <Button type="submit" fullWidth {loading}>
          {isRegister ? 'Register' : 'Login'}
        </Button>
      </div>
    </form>

    <div slot="footer" class="footer-text">
      {#if isRegister}
        Already have an account? <button type="button" class="text-link" on:click={() => isRegister = false}>Login here</button>
      {:else}
        Don't have an account? <button type="button" class="text-link" on:click={() => isRegister = true}>Register here</button>
      {/if}
    </div>
  </Card>
</div>

<style>
  .auth-container {
    max-width: 400px;
    margin: 4rem auto;
  }

  .error-banner {
    background-color: #fee2e2;
    color: #b91c1c;
    padding: 0.75rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .footer-text {
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .text-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--primary);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }
</style>
