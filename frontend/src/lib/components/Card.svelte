<script lang="ts">
  export let title: string = '';
  export let noPadding: boolean = false;
</script>

<div class="card">
  {#if title}
    <div class="card-header">
      <h3>{title}</h3>
    </div>
  {/if}
  
  <div class="card-body" class:no-padding={noPadding}>
    <slot />
  </div>
  
  {#if $$slots.footer}
    <div class="card-footer">
      <slot name="footer" />
    </div>
  {/if}
</div>

<style>
  .card {
    background-color: var(--surface-color);
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }

  .card-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background-color: rgba(249, 250, 251, 0.5);
  }

  .card-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .card-body {
    padding: 1.25rem;
  }

  .card-body.no-padding {
    padding: 0;
  }

  .card-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border-color);
    background-color: rgba(249, 250, 251, 0.5);
  }
</style>
