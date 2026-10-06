<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-page">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message ?? 'Halaman tidak ditemukan.'}</p>
  <a href="/">Kembali ke beranda</a>
</div>

<style>
  .error-page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: var(--color-surface, #09090b);
    color: var(--color-text, #f5f5f5);
    text-align: center;
    padding: 2rem;
  }

  h1 {
    font-size: 4rem;
    margin: 0;
  }

  a {
    color: var(--color-primary-500, #60a5fa);
  }
</style>
