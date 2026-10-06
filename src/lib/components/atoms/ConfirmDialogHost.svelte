<script lang="ts">
  import { confirmDialogStore } from '$lib/stores/confirm.store';
  import Icon from '$lib/components/atoms/Icon.svelte';
</script>

{#if $confirmDialogStore.open}
  <button class="backdrop" type="button" aria-label="Batal" on:click={confirmDialogStore.cancel}></button>
  <div class="dialog" role="alertdialog" aria-modal="true">
    <div class="card">
      {#if $confirmDialogStore.danger}
        <div class="icon-wrap"><Icon name="warning" size={26} /></div>
      {/if}
      <h3>{$confirmDialogStore.title}</h3>
      <p>{$confirmDialogStore.message}</p>
      <div class="actions">
        <button class="cancel" type="button" on:click={confirmDialogStore.cancel}>{$confirmDialogStore.cancelLabel}</button>
        <button class={`confirm ${$confirmDialogStore.danger ? 'danger' : 'primary'}`} type="button" on:click={confirmDialogStore.accept}>{$confirmDialogStore.confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, var(--color-text, #202124), transparent 55%);
    border: 0;
    z-index: 80;
  }

  .dialog {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 81;
    padding: 1rem;
  }

  .card {
    width: min(26rem, 100%);
    background: var(--color-surface-card, #fff);
    border: 1px solid var(--color-outline, #e0e0e0);
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    box-shadow: var(--shadow-modal, 0 20px 50px rgba(0, 0, 0, 0.2));
  }

  .icon-wrap {
    color: var(--color-warning, #f29900);
    margin-bottom: 0.5rem;
  }

  h3 {
    margin: 0 0 0.4rem;
    font-size: 1.05rem;
  }

  p {
    margin: 0 0 1.1rem;
    color: var(--color-text-muted);
    font-size: 0.87rem;
    white-space: pre-line;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }

  .cancel {
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    border-radius: 0.7rem;
    padding: 0.55rem 1.1rem;
    font-weight: 700;
    cursor: pointer;
  }

  .confirm {
    border: 0;
    border-radius: 0.7rem;
    padding: 0.55rem 1.4rem;
    font-weight: 800;
    cursor: pointer;
    color: #fff;
  }

  .confirm.primary {
    background: var(--gradient-signature, #0051ff);
  }

  .confirm.danger {
    background: var(--color-danger, #d93025);
  }
</style>
