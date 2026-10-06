<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = 'primary';
  export let ariaLabel = 'Warna label';

  const dispatch = createEventDispatcher<{ change: string }>();

  export const COLOR_OPTIONS = [
    { key: 'primary', label: 'Biru' },
    { key: 'success', label: 'Hijau' },
    { key: 'warning', label: 'Oranye' },
    { key: 'danger', label: 'Merah' },
    { key: 'neutral', label: 'Abu' }
  ];

  let open = false;
  let root: HTMLDivElement | undefined;

  $: selected = COLOR_OPTIONS.find((option) => option.key === value) ?? COLOR_OPTIONS[0];

  function toggle() {
    open = !open;
  }

  function choose(next: string) {
    value = next;
    open = false;
    dispatch('change', next);
  }

  function handleDocClick(event: MouseEvent) {
    if (!open || !root) return;
    if (!root.contains(event.target as Node)) {
      open = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      open = false;
    }
  }
</script>

<svelte:window on:click={handleDocClick} on:keydown={handleKeydown} />

<div class="color-select" bind:this={root}>
  <button
    class="trigger"
    type="button"
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    title={selected.label}
    on:click|stopPropagation={toggle}
  >
    <span class={`swatch tone-${selected.key}`}></span>
    <span class="caret">▾</span>
  </button>

  {#if open}
    <ul class="palette" role="listbox" aria-label={ariaLabel}>
      {#each COLOR_OPTIONS as option (option.key)}
        <li>
          <button
            class={`swatch-btn tone-${option.key} ${option.key === value ? 'active' : ''}`}
            type="button"
            role="option"
            aria-selected={option.key === value}
            aria-label={option.label}
            title={option.label}
            on:click|stopPropagation={() => choose(option.key)}
          >
            <span class="swatch"></span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .color-select {
    position: relative;
  }

  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: var(--color-surface-card);
    color: var(--color-text);
    border-radius: var(--radius-md);
    padding: 0.55rem 0.5rem;
    cursor: pointer;
    min-height: 2.25rem;
  }

  .caret {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }

  .swatch {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    flex: 0 0 auto;
    background: var(--color-primary-500);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, #000, transparent 85%);
  }

  .tone-success .swatch { background: var(--color-success); }
  .tone-warning .swatch { background: var(--color-warning); }
  .tone-danger .swatch { background: var(--color-danger); }
  .tone-neutral .swatch { background: var(--color-text-muted); }

  .palette {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    z-index: 5;
    list-style: none;
    margin: 0;
    padding: 0.35rem;
    display: flex;
    gap: 0.3rem;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 60%);
    background: var(--color-surface-card);
    box-shadow: var(--shadow-modal);
  }

  .palette li {
    display: inline-flex;
  }

  .swatch-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid transparent;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  .swatch-btn.active {
    border-color: var(--color-primary-500);
  }

  .swatch-btn:hover {
    background: color-mix(in srgb, var(--color-text), transparent 92%);
  }
</style>