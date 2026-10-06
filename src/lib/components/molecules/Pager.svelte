<script lang="ts">
  /**
   * Pagination reusable — gaya sama di semua halaman daftar (User List, Semua Email).
   */
  export let page = 1;
  /** Bila 0/kosong, dihitung otomatis dari `total`/`pageSize`. */
  export let totalPages = 0;
  export let total = 0;
  export let pageSize = 20;
  export let label = '';
  export let onPage: ((next: number) => void) | undefined = undefined;

  const nf = new Intl.NumberFormat('id-ID');

  $: pages = totalPages > 0 ? totalPages : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  $: rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  $: rangeEnd = Math.min(page * pageSize, total);
  $: canPrev = page > 1;
  $: canNext = page < pages;

  function go(next: number) {
    const target = Math.min(Math.max(1, next), Math.max(1, pages));
    if (target === page) {
      return;
    }
    onPage?.(target);
  }
</script>

<div class="pager">
  <div class="info">
    <span>Menampilkan {nf.format(rangeStart)}–{nf.format(rangeEnd)} dari {nf.format(total)}</span>
    {#if label}
      <span class="label">{label}</span>
    {/if}
  </div>
  <div class="controls">
    <button type="button" disabled={!canPrev} on:click={() => go(page - 1)} aria-label="Halaman sebelumnya">‹</button>
    <span class="page">Halaman {page} / {Math.max(1, pages)}</span>
    <button type="button" disabled={!canNext} on:click={() => go(page + 1)} aria-label="Halaman berikutnya">›</button>
  </div>
</div>

<style>
  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid color-mix(in srgb, var(--color-outline), transparent 78%);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .info {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .label {
    border-radius: 9999px;
    padding: 0.15rem 0.55rem;
    background: color-mix(in srgb, var(--color-outline), transparent 78%);
  }

  .controls {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .controls button {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: transparent;
    color: var(--color-text);
    font-size: 1rem;
    cursor: pointer;
  }

  .controls button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary-500), transparent 92%);
  }

  .controls button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page {
    white-space: nowrap;
  }
</style>