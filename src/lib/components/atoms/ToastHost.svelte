<script lang="ts">
  import { toastStore } from '$lib/stores/toast.store';
  import Icon from '$lib/components/atoms/Icon.svelte';
</script>

<div class="toast-host" aria-live="polite">
  {#each $toastStore as toast (toast.id)}
    <div class={`toast ${toast.kind}`} role="status">
      <Icon name={toast.kind === 'error' ? 'error' : toast.kind === 'info' ? 'info' : 'check_circle'} size={18} />
      <span>{toast.message}</span>
      <button type="button" aria-label="Tutup" on:click={() => toastStore.dismiss(toast.id)}>
        <Icon name="close" size={16} />
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-host {
    position: fixed;
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 90;
    max-width: min(92vw, 26rem);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-text, #202124);
    color: #fff;
    border-radius: 9999px;
    padding: 0.55rem 1rem;
    font-size: 0.84rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }

  .toast.error {
    background: var(--color-danger, #d93025);
  }

  .toast.info {
    background: var(--color-primary-500, #1a73e8);
  }

  .toast span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toast button {
    border: 0;
    background: transparent;
    color: inherit;
    display: inline-flex;
    cursor: pointer;
    padding: 0;
  }
</style>
