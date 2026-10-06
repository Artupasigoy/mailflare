<script lang="ts">
  import { afterNavigate, goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import AppSidebar from '$lib/components/organisms/AppSidebar.svelte';
  import AppTopbar from '$lib/components/organisms/AppTopbar.svelte';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import MailRow from '$lib/components/molecules/MailRow.svelte';
  import Pager from '$lib/components/molecules/Pager.svelte';
  import SearchSortBar from '$lib/components/molecules/SearchSortBar.svelte';
  import { sidebarCollapsed } from '$lib/stores/ui.store';
  import type { PageData } from './$types';

  export let data: PageData;

  $: adminEmail = $page.data.sessionEmail ?? null;
  $: searchQuery = data.search ?? '';

  $: totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  $: unreadCount = data.emails.filter((email) => !email.isRead).length;
  let refreshing = false;
  let refreshedAt = new Date();

  async function handleRefresh() {
    if (refreshing) {
      return;
    }
    refreshing = true;
    try {
      await invalidateAll();
      refreshedAt = new Date();
    } finally {
      refreshing = false;
    }
  }

  const nf = new Intl.NumberFormat('id-ID');

  afterNavigate(({ to }) => {
    const next = to?.url.searchParams.get('q') ?? '';
    if (next !== searchQuery) {
      searchQuery = next;
    }
  });

  function buildHref(opts: { q?: string; page?: number }): string {
    const params = new URLSearchParams();
    const q = (opts.q ?? searchQuery).trim();
    if (q) {
      params.set('q', q);
    }
    if (opts.page && opts.page > 1) {
      params.set('page', String(opts.page));
    }
    const queryString = params.toString();
    return `/users/emails${queryString ? `?${queryString}` : ''}`;
  }

  function handleSubmit() {
    // Hindari full-scan: minimal 2 karakter sebelum menjalankan query.
    if (searchQuery.trim().length < 2) {
      void goto(buildHref({ q: '', page: 1 }), { replaceState: true, keepFocus: true, noScroll: true });
      return;
    }
    void goto(buildHref({ page: 1 }), { replaceState: true, keepFocus: true, noScroll: true });
  }

  function goPage(next: number) {
    void goto(buildHref({ page: Math.min(Math.max(1, next), totalPages) }), { keepFocus: true, noScroll: true });
  }

  function senderLabel(sender: string): string {
    const match = sender.match(/^([^<]+)/);
    return String(match ? match[1] : sender).replace(/"/g, '').trim();
  }

  function timeLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    const now = new Date();
    const sameDay =
      now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
    if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sameYear = now.getFullYear() === date.getFullYear();
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  }
</script>

<div class="layout-shell">
  <AppSidebar active="emails" adminEmail={adminEmail} />
  <section class="main" class:sidebar-collapsed={$sidebarCollapsed}>
    <AppTopbar
      title="Semua Email Masuk"
      variant="minimal"
      showSearch={false}
      showRefresh={false}
      showLogout={false}
    />

    <div class="content">
      <SearchSortBar
        bind:searchQuery
        searchPlaceholder="Cari pengirim, penerima, atau subjek..."
        onSearch={handleSubmit}
        minChars={2}
      />
      <CardSurface className="mail-surface">
        <div class="head">
          <div>
            <h2>Semua Email Masuk</h2>
            <p class="text-muted">
              Gabungan email dari seluruh akun member, urut dari yang terbaru.
            </p>
          </div>
          <div class="head-actions">
            <span class="badge">{nf.format(data.total)} email</span>
            <button
              class="refresh-btn"
              class:spinning={refreshing}
              type="button"
              aria-label="Muat ulang daftar email"
              title="Muat ulang"
              disabled={refreshing}
              on:click={handleRefresh}
            >
              <Icon name="refresh" size={18} />
            </button>
          </div>
        </div>

        <div class="summary">
          <span class="text-muted">Diperbarui {refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          {#if data.search}
            <span class="chip">Pencarian: “{data.search}”</span>
            <a class="reset" href="/users/emails">Reset</a>
          {/if}
        </div>

        {#if data.emails.length === 0}
          <div class="empty">
            <Icon name="inbox" size={36} />
            <h3>Belum ada email</h3>
            <p class="text-muted">Email yang masuk ke semua akun akan muncul di sini.</p>
          </div>
        {:else}
          <div class="list">
            {#each data.emails as email (email.id)}
              <MailRow
                href={`/users/${email.userId}/emails/${email.id}?from=all`}
                sender={senderLabel(email.sender)}
                subject={email.subject}
                snippet={email.snippet}
                receivedAt={timeLabel(email.receivedAt)}
                isRead={email.isRead}
                isStarred={email.isStarred}
                recipient={email.recipient}
                showRecipient={true}
              >
                <svelte:fragment slot="star">
                  <span class="star" class:on={email.isStarred} aria-hidden="true">
                    <Icon name={email.isStarred ? 'star' : 'star_outline'} size={17} />
                  </span>
                </svelte:fragment>
              </MailRow>
            {/each}
          </div>

          <Pager
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={goPage}
            label={`${nf.format(unreadCount)} belum dibaca di halaman ini`}
          />
        {/if}
      </CardSurface>
    </div>
  </section>
</div>

<style>
  .content {
    padding: var(--space-5);
  }

  .list {
    border-top: 1px solid var(--gm-line);
    border-bottom: 1px solid var(--gm-line);
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .head h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .head-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    height: 2.1rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    border-radius: 50%;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
  }

  .refresh-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-primary-500), transparent 92%);
  }

  .refresh-btn:disabled {
    cursor: default;
  }

  .refresh-btn.spinning :global(.material-symbols-outlined) {
    animation: spin-refresh 0.9s linear infinite;
  }

  @keyframes spin-refresh {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .badge {
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-primary-500), transparent 88%);
    color: var(--color-primary-500);
    padding: 0.3rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: var(--space-3) 0 var(--space-2);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .chip {
    border-radius: 9999px;
    padding: 0.2rem 0.6rem;
    background: color-mix(in srgb, var(--color-outline), transparent 78%);
  }

  .reset {
    color: var(--color-primary-500);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .star {
    color: var(--gm-star-off);
    display: inline-flex;
  }

  .star.on {
    color: var(--gm-blue);
  }

  .empty {
    display: grid;
    place-items: center;
    gap: 0.5rem;
    padding: var(--space-8) var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text);
  }

</style>