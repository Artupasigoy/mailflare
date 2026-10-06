<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AppSidebar from '$lib/components/organisms/AppSidebar.svelte';
  import AppTopbar from '$lib/components/organisms/AppTopbar.svelte';
  import MailboxTopbar from '$lib/components/organisms/MailboxTopbar.svelte';
  import GmailInbox from '$lib/components/organisms/GmailInbox.svelte';
  import GmailTabs from '$lib/components/organisms/GmailTabs.svelte';
  import BackLink from '$lib/components/molecules/BackLink.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import { sidebarCollapsed } from '$lib/stores/ui.store';
  import type { PageData } from './$types';

  export let data: PageData;

  $: adminEmail = $page.data.sessionEmail ?? null;

  let searchQuery = '';

  $: unreadCount = data.emails.filter((email) => !email.isRead && !email.isArchived).length;
  $: activeQuery = data.search?.query ?? '';
  $: isSearching = data.search !== null;

  type MailboxView = 'inbox' | 'starred' | 'trash';
  $: rawView = $page.url.searchParams.get('view');
  $: view = (rawView === 'starred' ? 'starred' : rawView === 'trash' ? 'trash' : 'inbox') as MailboxView;

  afterNavigate(({ to }) => {
    const next = to?.url.searchParams.get('q') ?? '';
    if (next !== searchQuery) {
      searchQuery = next;
    }
  });

  function buildHref(q: string): string {
    const trimmed = q.trim();
    const base = `/users/${data.userId}/inbox`;
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

{#if data.inboxOnly}
  <section class="inbox-only-main">
    <MailboxTopbar
      userLabel={data.currentUser?.displayName ?? data.currentUser?.email ?? data.userId}
      bind:searchQuery
      searchPlaceholder="Cari di subject, pengirim, atau body email..."
      onSearch={handleSubmit}
    />

    <div class="content">
      <div class="inbox-head">
        <div class="title-wrap">
          <h1>Inbox</h1>
          <span class="badge">{unreadCount} New</span>
        </div>
      </div>

      {#if isSearching && data.emails.length === 0}
        <div class="empty-search">
          <Icon name="search_off" size={36} />
          <h3>Tidak ada email cocok</h3>
          <button type="button" class="reset-btn" on:click={handleClear}>
            <Icon name="arrow_back" size={16} />
            <span>Kembali ke inbox</span>
          </button>
        </div>
      {:else}
        <div class="back-row">
          <BackLink href="/users" label="Kembali ke User List" />
        </div>
        <div class="tab-wrap">
          <GmailTabs view={view} basePath={`/users/${data.userId}/inbox`} searchQuery={searchQuery} />
        </div>
        <GmailInbox
          emails={data.emails}
          trashEmails={data.trashEmails ?? []}
          emailHrefPrefix="/me/emails"
          apiHrefPrefix="/api/me/emails"
          isSearching={isSearching}
          resultCount={data.search?.resultCount ?? 0}
          view={view}
          trashEmptyUrl="/api/me/trash/empty"
        />
      {/if}
    </div>
  </section>
{:else}
  <div class="layout-shell">
    <AppSidebar active="users" adminEmail={adminEmail} />
    <section class="main" class:sidebar-collapsed={$sidebarCollapsed}>
      <AppTopbar
        title="Inbox"
        bind:searchQuery
        searchPlaceholder="Cari email..."
        onSearch={handleSubmit}
        showRefresh={false}
        showLogout={false}
        mailboxEmail={data.currentUser?.email ?? data.userId}
      />

      <div class="content">
        {#if isSearching && data.emails.length === 0}
          <div class="empty-search">
            <Icon name="search_off" size={36} />
            <h3>Tidak ada email cocok</h3>
            <button type="button" class="reset-btn" on:click={handleClear}>
              <Icon name="arrow_back" size={16} />
              <span>Kembali ke inbox</span>
            </button>
          </div>
        {:else}
          <div class="back-row">
            <BackLink href="/users" label="Kembali ke User List" />
          </div>
          <div class="tab-wrap">
            <GmailTabs view={view} basePath={`/users/${data.userId}/inbox`} searchQuery={searchQuery} />
          </div>
          <GmailInbox
            emails={data.emails}
            trashEmails={data.trashEmails ?? []}
            emailHrefPrefix={`/users/${data.userId}/emails`}
            apiHrefPrefix={`/api/users/${data.userId}/emails`}
            isSearching={isSearching}
            resultCount={data.search?.resultCount ?? 0}
            view={view}
            trashEmptyUrl={`/api/users/${data.userId}/trash/empty`}
          />
        {/if}
      </div>
    </section>
  </div>
{/if}

<style>
  .main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .content {
    padding: var(--space-5);
    flex: 1;
    display: grid;
    gap: var(--space-3);
    align-content: start;
  }

  .inbox-only-main .content {
    align-content: start;
  }

  .back-row {
    display: flex;
    justify-content: flex-start;
  }

  .tab-wrap {
    background: var(--gm-bg);
    border: 1px solid var(--gm-border);
    border-radius: 12px;
    padding: 0 0.35rem;
  }

  .inbox-only-main {
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .inbox-only-main .content {
    max-width: 80rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
    display: grid;
    gap: var(--space-5);
  }

  .inbox-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .title-wrap {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
  }

  .title-wrap h1 {
    font-size: 1.8rem;
    line-height: 1.2;
  }

  .badge {
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--color-primary-500), transparent 88%);
    color: var(--color-primary-500);
    padding: 0.3rem 0.62rem;
    font-size: 0.74rem;
    font-weight: 700;
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
</style>