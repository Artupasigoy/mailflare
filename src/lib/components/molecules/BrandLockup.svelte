<script lang="ts">
  export let compact = false;
</script>

<div class="brand" class:compact>
  <span class="logo-mark">M</span>
  {#if !compact}
    <span class="logo-text">Mailflare</span>
  {/if}
</div>

<style>
  .brand {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }

  .brand.compact {
    justify-content: center;
  }

  .logo-mark {
    font-family: var(--font-family-headline);
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1;
    color: var(--color-primary-500);
  }

  .logo-text {
    font-family: var(--font-family-headline);
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text);
    white-space: nowrap;
  }
</style>
