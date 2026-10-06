<script lang="ts">
  /**
   * Filter status (segmented control) — reusable untuk daftar admin.
   */
  type FilterKey = string;

  export let value: FilterKey = 'all';
  export let options: Array<{ key: FilterKey; label: string; count?: number }> = [];
  export let onChange: ((next: FilterKey) => void) | undefined = undefined;
</script>

<div class="segmented" role="group" aria-label="Filter status">
  {#each options as option (option.key)}
    <button
      class="seg"
      class:active={value === option.key}
      type="button"
      aria-pressed={value === option.key}
      on:click={() => onChange?.(option.key)}
    >
      {option.label}{#if typeof option.count === 'number'}<span class="count">{option.count}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.2rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-primary-500), transparent 93%);
  }

  .seg {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    border-radius: 9999px;
    padding: 0.3rem 0.85rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .seg:hover {
    color: var(--color-text);
  }

  .seg.active {
    background: var(--color-primary-500);
    color: #fff;
  }

  .count {
    font-size: 0.72rem;
    opacity: 0.85;
  }
</style>