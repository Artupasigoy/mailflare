<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { LabelDto } from '$lib/types/dto';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import InputText from '$lib/components/atoms/InputText.svelte';
  import ColorSelect from '$lib/components/molecules/ColorSelect.svelte';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let open = false;
  export let labels: LabelDto[] = [];

  const dispatch = createEventDispatcher<{ close: void; changed: void }>();

  let newName = '';
  let newColor = 'primary';
  let newVisible = true;
  let editingId = '';
  let editName = '';
  let editColor = 'primary';
  let editVisible = true;
  let pending = false;
  let errorMessage = '';

  $: if (!open) {
    resetState();
  }

  function resetState() {
    newName = '';
    newColor = 'primary';
    newVisible = true;
    editingId = '';
    editName = '';
    editColor = 'primary';
    editVisible = true;
    errorMessage = '';
    pending = false;
  }

  function close() {
    if (pending) return;
    dispatch('close');
  }

  function startEdit(label: LabelDto) {
    editingId = label.id;
    editName = label.name;
    editColor = label.color;
    editVisible = label.visible !== false;
    errorMessage = '';
  }

  function cancelEdit() {
    editingId = '';
    editName = '';
    errorMessage = '';
  }

  async function createLabel() {
    const name = newName.trim();
    if (!name || pending) return;
    pending = true;
    errorMessage = '';
    try {
      const response = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, color: newColor, visible: newVisible })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        errorMessage = payload?.error ?? 'Gagal membuat label.';
        return;
      }
      newName = '';
      newColor = 'primary';
      newVisible = true;
      toastStore.success('Label dibuat');
      dispatch('changed');
    } catch {
      errorMessage = 'Gagal menghubungi server.';
    } finally {
      pending = false;
    }
  }

  async function saveEdit() {
    const name = editName.trim();
    if (!name || !editingId || pending) return;
    pending = true;
    errorMessage = '';
    try {
      const response = await fetch(`/api/labels/${encodeURIComponent(editingId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, color: editColor, visible: editVisible })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        errorMessage = payload?.error ?? 'Gagal memperbarui label.';
        return;
      }
      cancelEdit();
      toastStore.success('Label diperbarui');
      dispatch('changed');
    } catch {
      errorMessage = 'Gagal menghubungi server.';
    } finally {
      pending = false;
    }
  }

  async function toggleVisibility(label: LabelDto) {
    if (pending) return;
    const nextVisible = label.visible === false;
    pending = true;
    errorMessage = '';
    try {
      const response = await fetch(`/api/labels/${encodeURIComponent(label.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: label.name, color: label.color, visible: nextVisible })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        errorMessage = payload?.error ?? 'Gagal mengubah visibilitas label.';
        return;
      }
      toastStore.success(nextVisible ? 'Label ditampilkan' : 'Label disembunyikan');
      dispatch('changed');
    } catch {
      errorMessage = 'Gagal menghubungi server.';
    } finally {
      pending = false;
    }
  }

  async function deleteLabel(label: LabelDto) {
    if (pending) return;
    if (
      !(await confirmDialog({
        title: 'Hapus Label',
        message: `Label "${label.name}" akan dihapus dan dilepas dari ${label.userCount} user. Tindakan ini tidak bisa dibatalkan.`,
        confirmLabel: 'Hapus',
        danger: true
      }))
    )
      return;
    pending = true;
    errorMessage = '';
    try {
      const response = await fetch(`/api/labels/${encodeURIComponent(label.id)}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        errorMessage = payload?.error ?? 'Gagal menghapus label.';
        return;
      }
      toastStore.success('Label dihapus');
      dispatch('changed');
    } catch {
      errorMessage = 'Gagal menghubungi server.';
    } finally {
      pending = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !pending) {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <button class="modal-backdrop" type="button" aria-label="Tutup" on:click={close}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="label-manager-title">
    <div class="modal-card">
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={pending} on:click={close}>
        <Icon name="close" size={18} />
      </button>
      <div class="modal-head">
        <h3 id="label-manager-title">Kelola Label</h3>
        <p class="text-muted">Label untuk menandai akun member. Satu user boleh punya banyak label.</p>
      </div>

      <div class="modal-body">
        <form class="create-row" on:submit|preventDefault={createLabel}>
          <InputText bind:value={newName} placeholder="Nama label baru" ariaLabel="Nama label baru" />
          <ColorSelect bind:value={newColor} ariaLabel="Warna label baru" />
          <button class="btn-add" type="submit" disabled={pending || !newName.trim()}>
            <Icon name="add" size={16} />
            Tambah
          </button>
        </form>

        {#if labels.length === 0}
          <div class="empty">
            <Icon name="sell" size={32} />
            <p>Belum ada label. Buat label pertama di atas.</p>
          </div>
        {:else}
          <ul class="label-list">
            {#each labels as label (label.id)}
              <li class="label-row">
                {#if editingId === label.id}
                  <InputText bind:value={editName} ariaLabel="Nama label" />
                  <ColorSelect bind:value={editColor} ariaLabel="Warna label" />
                  <label class="vis-toggle" title="Tampilkan label">
                    <input type="checkbox" bind:checked={editVisible} />
                    <span>Tampilkan</span>
                  </label>
                  <div class="row-actions">
                    <button class="icon-btn" type="button" title="Batal" aria-label="Batal" disabled={pending} on:click={cancelEdit}>
                      <Icon name="close" size={16} />
                    </button>
                    <button class="icon-btn" type="button" title="Simpan" aria-label="Simpan label" disabled={pending} on:click={saveEdit}>
                      <Icon name="check" size={16} />
                    </button>
                  </div>
                {:else}
                  <span class={`chip tone-${label.color} ${label.visible === false ? 'is-hidden' : ''}`}>
                    <span class="dot"></span>
                    {label.name}
                  </span>
                  <span class="count text-muted">{label.userCount} user{label.visible === false ? ' · disembunyikan' : ''}</span>
                  <div class="row-actions">
                    <button
                      class="icon-btn"
                      type="button"
                      title={label.visible === false ? 'Tampilkan label' : 'Sembunyikan label'}
                      aria-label={label.visible === false ? 'Tampilkan label' : 'Sembunyikan label'}
                      aria-pressed={label.visible === false}
                      disabled={pending}
                      on:click={() => toggleVisibility(label)}
                    >
                      <Icon name={label.visible === false ? 'visibility_off' : 'visibility'} size={16} />
                    </button>
                    <button class="icon-btn" type="button" title="Ubah label" aria-label="Ubah label" disabled={pending} on:click={() => startEdit(label)}>
                      <Icon name="edit" size={16} />
                    </button>
                    <button class="icon-btn danger" type="button" title="Hapus label" aria-label="Hapus label" disabled={pending} on:click={() => deleteLabel(label)}>
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: color-mix(in srgb, var(--color-text), transparent 60%);
    backdrop-filter: blur(2px);
    z-index: 40;
  }

  .modal {
    position: fixed;
    inset: 0;
    z-index: 41;
    display: grid;
    place-items: center;
    padding: var(--space-5);
  }

  .modal-card {
    position: relative;
    width: min(30rem, 100%);
    max-height: 88vh;
    overflow: auto;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 75%);
    background: var(--color-surface-card);
    box-shadow: var(--shadow-modal);
  }

  .modal-close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .modal-close:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-text), transparent 92%);
    color: var(--color-text);
  }

  .modal-head {
    padding: var(--space-6) var(--space-6) var(--space-3);
  }

  .modal-head h3 {
    font-size: 1.3rem;
    margin-bottom: 0.25rem;
  }

  .modal-body {
    padding: 0 var(--space-6) var(--space-6);
  }

  .create-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .vis-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-muted);
    white-space: nowrap;
    cursor: pointer;
  }

  .vis-toggle input {
    accent-color: var(--color-primary-500);
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--gradient-signature);
    color: #fff;
    font-weight: 700;
    font-size: 0.82rem;
    padding: 0.7rem 0.9rem;
    cursor: pointer;
    white-space: nowrap;
  }

  .btn-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .label-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }

  .label-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 78%);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.6rem;
  }

  .label-row .count {
    margin-left: auto;
  }

  .label-row .row-actions {
    margin-left: auto;
  }

  .label-row .count + .row-actions {
    margin-left: 0;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 0;
  }

  .chip.is-hidden {
    opacity: 0.5;
  }

  .chip .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    flex: 0 0 auto;
    background: var(--color-primary-500);
  }

  .chip.tone-success .dot { background: var(--color-success); }
  .chip.tone-warning .dot { background: var(--color-warning); }
  .chip.tone-danger .dot { background: var(--color-danger); }
  .chip.tone-neutral .dot { background: var(--color-text-muted); }

  .count {
    font-size: 0.75rem;
    white-space: nowrap;
  }

  .row-actions {
    display: inline-flex;
    gap: 0.25rem;
  }

  .icon-btn {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 60%);
    background: transparent;
    color: var(--color-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-btn:hover:not(:disabled) {
    color: var(--color-primary-500);
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 50%);
  }

  .icon-btn.danger {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger), transparent 60%);
  }

  .icon-btn.danger:hover:not(:disabled) {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger), transparent 90%);
  }

  .empty {
    display: grid;
    place-items: center;
    gap: 0.5rem;
    padding: var(--space-6) 0;
    color: var(--color-text-muted);
    text-align: center;
  }

  .error {
    margin: var(--space-3) 0 0;
    color: var(--color-danger);
    font-size: 0.82rem;
  }

  @media (max-width: 960px) {
    .modal {
      align-items: end;
      padding: 0;
    }

    .modal-card {
      width: 100%;
      max-height: 92vh;
      border-radius: 1rem 1rem 0 0;
    }

    .create-row {
      grid-template-columns: 1fr;
    }
  }
</style>