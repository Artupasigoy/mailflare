<script lang="ts">
  /**
   * Kontrol pencarian + urutan reusable untuk halaman daftar admin.
   *.search  → full-width pill (meniru Gmail)
   * .sort    → tombol chip (meniru gaya filter yang sudah dipakai)
   */
  export let searchQuery = '';
  export let searchPlaceholder = 'Cari...';
  export let onSearch: (() => void) | undefined = undefined;
  export let minChars = 2;

  type SortOption = { key: string; label: string };

  export let sort = '';
  export let sortOptions: SortOption[] = [];
  export let onSort: ((next: string) => void) | undefined = undefined;

  function submit() {
    onSearch?.();
  }
</script>

<div class="toolbar">
  <div class="search">
    <span class="icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    </span>
    <input
      type="search"
      bind:value={searchQuery}
      placeholder={searchPlaceholder}
      aria-label={searchPlaceholder}
      on:keydown={(event) => {
        if (event.key === 'Enter') {
          submit();
        }
      }}
    />
    <button class="go" type="button" on:click={submit} disabled={searchQuery.trim().length < minChars}>
      Cari
    </button>
  </div>

  {#if sortOptions.length > 0}
    <label class="sort">
      <span class="sort-label">Urutkan:</span>
      <select
        class="sort-select"
        aria-label="Urutkan"
        value={sort}
        on:change={(event) => onSort?.(event.currentTarget.value)}
      >
        {#each sortOptions as option (option.key)}
          <option value={option.key}>{option.label}</option>
        {/each}
      </select>
    </label>
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-bottom: var(--space-3);
  }

  .search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 16rem;
    max-width: 34rem;
    height: 2.6rem;
    padding: 0 0.4rem 0 0.9rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-primary-500), transparent 94%);
  }

  .search:focus-within {
    background: var(--color-surface-card);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary-500), transparent 65%);
  }

  .search .icon {
    display: inline-flex;
    color: var(--color-text-muted);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .go {
    border: 0;
    border-radius: 9999px;
    padding: 0.3rem 0.8rem;
    background: var(--color-primary-500);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .go:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .sort {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .sort-label {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin-right: 0.15rem;
  }

  .sort-select {
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: var(--color-surface-card);
    color: var(--color-text);
    border-radius: 9999px;
    padding: 0.3rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    outline: none;
  }

  .sort-select:focus {
    border-color: var(--color-primary-500);
  }

  @media (max-width: 720px) {
    .search {
      max-width: none;
    }
  }
</style>