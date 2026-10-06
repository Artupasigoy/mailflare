<script lang="ts">
  /**
   * Tombol/link kembali reusable (Gmail-like).
   * Dipakai di atas baris tab (Kotak Masuk / Berbintang / Sampah) pada halaman detail email.
   */
  export let href = '/';
  export let label = 'Kembali';
  export let tone: 'gm' | 'app' = 'gm';
</script>

<a class={`back-link ${tone}`} {href}>
  <span class="icon" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  </span>
  <span class="text">{label}</span>
</a>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem 0.35rem 0.4rem;
    border-radius: 9999px;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .back-link.gm {
    color: var(--gm-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  .back-link.gm:hover {
    background: var(--gm-surface-2);
  }

  .back-link.app {
    color: var(--color-text);
  }

  .back-link.app:hover {
    background: color-mix(in srgb, var(--color-text), transparent 92%);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
    border-radius: 50%;
  }

  .icon:hover {
    background: color-mix(in srgb, currentColor, transparent 88%);
  }

  @media (max-width: 720px) {
    .text {
      display: none;
    }

    .back-link {
      padding: 0.35rem;
    }
  }
</style>