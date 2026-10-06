<script lang="ts">
  import Icon from '$lib/components/atoms/Icon.svelte';

  type MailboxView = 'inbox' | 'starred' | 'trash';

  export let view: MailboxView = 'inbox';
  /** Base path halaman daftar email, misal `/users/<id>/inbox`. */
  export let basePath = '/me/inbox';
  /** Parameter lain yang perlu dipertahankan (mis. `q=` dari pencarian). */
  export let searchQuery = '';

  const ITEMS: { key: MailboxView; label: string; icon: string }[] = [
    { key: 'inbox', label: 'Kotak Masuk', icon: 'inbox' },
    { key: 'starred', label: 'Berbintang', icon: 'star' },
    { key: 'trash', label: 'Sampah', icon: 'delete' }
  ];

  function hrefFor(next: MailboxView): string {
    const params = new URLSearchParams();
    const query = searchQuery.trim();
    if (query) {
      params.set('q', query);
    }
    if (next !== 'inbox') {
      params.set('view', next);
    }
    const queryString = params.toString();
    return `${basePath}${queryString ? `?${queryString}` : ''}`;
  }
</script>

<div class="tabs" role="tablist" aria-label="Menu email">
  {#each ITEMS as item (item.key)}
    <a
      class="tab"
      class:active={view === item.key}
      role="tab"
      aria-selected={view === item.key}
      href={hrefFor(item.key)}
    >
      <Icon name={item.icon} size={18} />
      <span>{item.label}</span>
    </a>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--gm-line);
    overflow-x: auto;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.85rem;
    color: var(--gm-muted);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }

  .tab:hover {
    background: var(--gm-hover);
  }

  .tab.active {
    color: var(--gm-blue);
    border-bottom-color: var(--gm-blue);
  }

  @media (max-width: 720px) {
    .tabs {
      padding: 0 0.25rem;
    }

    .tab {
      padding: 0.5rem 0.6rem;
      font-size: 0.8rem;
    }
  }
</style>