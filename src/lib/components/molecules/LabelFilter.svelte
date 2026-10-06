<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import type { LabelDto } from '$lib/types/dto';

  export let labels: LabelDto[] = [];
  export let value = '';
  export let onChange: ((next: string) => void) | undefined = undefined;
  export let onManage: (() => void) | undefined = undefined;

  let scroller: HTMLDivElement | undefined;
  let canLeft = false;
  let canRight = false;

  // Hanya label yang visible ditampilkan sebagai chip filter.
  $: visibleLabels = labels.filter((label) => label.visible !== false);

  function updateArrows() {
    if (!scroller) return;
    canLeft = scroller.scrollLeft > 2;
    canRight = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2;
  }

  function scrollBy(direction: -1 | 1) {
    scroller?.scrollBy({ left: direction * 180, behavior: 'smooth' });
  }

  function selectLabel(id: string) {
    onChange?.(value === id ? '' : id);
  }

  onMount(async () => {
    await tick();
    updateArrows();
  });

  $: if (labels && typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => updateArrows());
  }
</script>

<div class="label-filter">
  <span class="lf-title">Label</span>
  {#if visibleLabels.length === 0}
    <span class="lf-empty">Belum ada label</span>
  {:else}
    {#if canLeft}
      <button class="lf-arrow" type="button" aria-label="Geser ke kiri" title="Geser ke kiri" on:click={() => scrollBy(-1)}>
        <Icon name="chevron_left" size={16} />
      </button>
    {/if}
    <div
      class="lf-scroll"
      bind:this={scroller}
      on:scroll={updateArrows}
      role="group"
      aria-label="Filter label"
    >
      <button
        class="lf-chip"
        class:active={!value}
        type="button"
        aria-pressed={!value}
        on:click={() => onChange?.('')}
      >Semua label</button>
      {#each visibleLabels as label (label.id)}
        <button
          class={`lf-chip tone-${label.color}`}
          class:active={value === label.id}
          type="button"
          aria-pressed={value === label.id}
          on:click={() => selectLabel(label.id)}
        >
          <span class="dot"></span>
          {label.name}
          <span class="count">{label.userCount}</span>
        </button>
      {/each}
    </div>
    {#if canRight}
      <button class="lf-arrow" type="button" aria-label="Geser ke kanan" title="Geser ke kanan" on:click={() => scrollBy(1)}>
        <Icon name="chevron_right" size={16} />
      </button>
    {/if}
  {/if}
  <button class="lf-manage" type="button" title="Kelola label" aria-label="Kelola label" on:click={() => onManage?.()}>
    <Icon name="sell" size={16} />
    <span>Kelola</span>
  </button>
</div>

<style>
  .label-filter {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 100%;
    min-width: 0;
  }

  .lf-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .lf-empty {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .lf-scroll {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
    flex: 1;
    min-width: 0;
    padding: 0.1rem;
  }

  .lf-scroll::-webkit-scrollbar {
    display: none;
  }

  .lf-arrow {
    flex: 0 0 auto;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: var(--color-surface-card);
    color: var(--color-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .lf-arrow:hover {
    color: var(--color-primary-500);
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 55%);
  }

  .lf-chip {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 60%);
    background: var(--color-surface-card);
    color: var(--color-text);
    border-radius: 9999px;
    padding: 0.28rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .lf-chip:hover {
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 50%);
  }

  .lf-chip.active {
    background: var(--color-primary-500);
    border-color: var(--color-primary-500);
    color: #fff;
  }

  .lf-chip .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
  }

  .lf-chip.tone-success .dot { background: var(--color-success); }
  .lf-chip.tone-warning .dot { background: var(--color-warning); }
  .lf-chip.tone-danger .dot { background: var(--color-danger); }
  .lf-chip.tone-neutral .dot { background: var(--color-text-muted); }
  .lf-chip.active .dot { background: #fff; opacity: 0.9; }

  .lf-chip .count {
    font-size: 0.68rem;
    opacity: 0.75;
  }

  .lf-manage {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 60%);
    background: transparent;
    color: var(--color-primary-500);
    border-radius: 9999px;
    padding: 0.28rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .lf-manage:hover {
    background: color-mix(in srgb, var(--color-primary-500), transparent 92%);
  }

  @media (max-width: 720px) {
    .lf-manage span {
      display: none;
    }
  }
</style>