<script lang="ts">
  export let type: string = 'text';
  export let value: string = '';
  export let label: string = '';
  export let placeholder: string = '';
  export let required: boolean = false;
  export let disabled: boolean = false;
  export let error: string = '';

  const id = crypto.randomUUID();
</script>

<div class="input-wrapper">
  {#if label}
    <label for={id}>
      {label}
      {#if required}<span class="required">*</span>{/if}
    </label>
  {/if}
  
  {#if type === 'textarea'}
    <textarea {id} bind:value {placeholder} {required} {disabled} class:error={!!error}></textarea>
  {:else}
    <input {id} {type} bind:value {placeholder} {required} {disabled} class:error={!!error} />
  {/if}

  {#if error}
    <span class="error-text">{error}</span>
  {/if}
</div>

<style>
  .input-wrapper {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }

  label {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: var(--text-primary);
  }

  .required {
    color: var(--danger);
    margin-left: 0.25rem;
  }

  input, textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background-color: var(--surface-color);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input:focus, textarea:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }

  input.error, textarea.error {
    border-color: var(--danger);
  }

  input.error:focus, textarea.error:focus {
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
  }

  .error-text {
    color: var(--danger);
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>
