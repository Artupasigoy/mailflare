<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import GmailShell from '$lib/components/organisms/GmailShell.svelte';
  import GmailInbox from '$lib/components/organisms/GmailInbox.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  let searchQuery = '';

  $: unreadCount = data.emails.filter((email) => !email.isRead && !email.isArchived).length;

  $: activeQuery = data.search?.query ?? '';
  $: isSearching = data.search !== null;
  $: rawView = $page.url.searchParams.get('view');
  $: viewParam = (rawView === 'starred' ? 'starred' : rawView === 'trash' ? 'trash' : 'inbox') as 'inbox' | 'starred' | 'trash';
  $: displayedEmails = data.emails;

  afterNavigate(({ to }) => {
    const next = to?.url.searchParams.get('q') ?? '';
    if (next !== searchQuery) {
      searchQuery = next;
    }
  });

  function buildHref(q: string): string {
    const trimmed = q.trim();
    const base = '/me/inbox';
    if (!trimmed) {
      return base;
    }
    return `${base}?q=${encodeURIComponent(trimmed.slice(0, 200))}`;
  }

  function handleSubmit() {
    void goto(buildHref(searchQuery), {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  function handleClear() {
    searchQuery = '';
    void goto(buildHref(''), {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }
</script>

<GmailShell>
  <div class="content-wrap">
    <GmailInbox
      emails={displayedEmails}
      trashEmails={data.trashEmails ?? []}
      emailHrefPrefix="/me/emails"
      apiHrefPrefix="/api/me/emails"
      isSearching={isSearching}
      view={viewParam}
      trashEmptyUrl="/api/me/trash/empty"
    />

    {#if isSearching && displayedEmails.length === 0}
    <div class="empty-search">
      <Icon name="search_off" size={36} />
      <h3>Tidak ada email cocok</h3>
      <p class="text-muted">Pencarian memindai subject, pengirim, penerima, snippet, dan body email.</p>
      <button type="button" class="reset-btn" on:click={handleClear}>
        <Icon name="arrow_back" size={16} />
        <span>Kembali ke inbox</span>
      </button>
    </div>
  {/if}
  </div>
</GmailShell>

<style>
  .content-wrap {
    max-width: 80rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
    display: grid;
    gap: var(--space-5);
  }

  .empty-search {
    display: grid;
    place-items: center;
    gap: 0.6rem;
    text-align: center;
    padding: var(--space-8) var(--space-4);
    border: 1px dashed color-mix(in srgb, var(--color-outline), transparent 55%);
    border-radius: var(--radius-lg);
    color: var(--color-text-muted);
  }

  .empty-search h3 {
    margin: 0;
    font-size: 1.05rem;
    color: var(--color-text);
  }

  .empty-search p {
    margin: 0;
    max-width: 38ch;
  }

  .reset-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border: 0;
    background: var(--gradient-signature);
    color: #fff;
    font-weight: 700;
    font-size: 0.85rem;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-pill);
    cursor: pointer;
    margin-top: 0.4rem;
  }

  @media (max-width: 960px) {
    .content-wrap {
      padding: var(--space-5) var(--space-3);
      gap: var(--space-4);
    }
  }
</style>
