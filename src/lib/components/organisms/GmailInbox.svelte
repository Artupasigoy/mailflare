<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { EmailDto } from '$lib/types/dto';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import MailRow from '$lib/components/molecules/MailRow.svelte';
  import { toastStore } from '$lib/stores/toast.store';

  export let emails: EmailDto[] = [];
  export let trashEmails: EmailDto[] = [];
  export let emailHrefPrefix = '/me/emails';
  export let apiHrefPrefix = '/api/me/emails';
  export let isSearching = false;
  export let resultCount = 0;
  export let searchQuery = '';
  export let view: 'inbox' | 'starred' | 'trash' = 'inbox';
  export let trashEmptyUrl = '';

  const PAGE_SIZE = 50;
  const nf = new Intl.NumberFormat('id-ID');
  let pageIndex = 0;
  let pendingId = '';
  let refreshing = false;
  let selectedIds: string[] = [];
  let bulkPending = false;
  let selectAllEl: HTMLInputElement | undefined;
  let lastView = view;
  let emptyPending = false;
  let emptyError = '';

  $: activeView = view;
  $: inboxEmails = emails.filter((email) => !email.isArchived);
  $: starredEmails = emails.filter((email) => email.isStarred && !email.isArchived);
  $: visible = activeView === 'starred' ? starredEmails : activeView === 'trash' ? trashEmails : inboxEmails;
  $: displayed = isSearching ? emails : visible;
  $: totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  $: paginated = displayed.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
  $: rangeStart = displayed.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  $: rangeEnd = Math.min((pageIndex + 1) * PAGE_SIZE, displayed.length);
  $: if (pageIndex > totalPages - 1) pageIndex = Math.max(0, totalPages - 1);
  $: pageIds = paginated.map((email) => email.id);
  $: viewSuffix = isSearching || activeView === 'inbox' ? '' : `?view=${activeView}`;
  $: selectedSet = new Set(selectedIds);
  $: selectedOnPage = pageIds.filter((id) => selectedSet.has(id)).length;
  $: selectedItems = emails.filter((email) => selectedSet.has(email.id));
  $: allSelectedRead = selectedItems.length > 0 && selectedItems.every((email) => email.isRead);
  $: allSelectedUnread = selectedItems.length > 0 && selectedItems.every((email) => !email.isRead);
  $: bulkReadAction = allSelectedRead && !allSelectedUnread ? 'unread' : 'read';
  $: allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;
  $: somePageSelected = selectedOnPage > 0 && !allPageSelected;
  $: selectionCount = selectedIds.length;

  $: if (selectAllEl) {
    selectAllEl.indeterminate = somePageSelected;
  }

  // Buang pilihan yang emailnya sudah tidak ada (terhapus / dipulihkan / data berubah).
  $: {
    const valid = new Set([...emails.map((email) => email.id), ...trashEmails.map((email) => email.id)]);
    const pruned = selectedIds.filter((id) => valid.has(id));
    if (pruned.length !== selectedIds.length) {
      selectedIds = pruned;
    }
  }

  // Ganti tampilan -> kembali ke halaman 1 & kosongkan pilihan.
  $: if (lastView !== view) {
    lastView = view;
    pageIndex = 0;
    selectedIds = [];
  }

  function toggleSelect(id: string) {
    selectedIds = selectedSet.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      const pageSet = new Set(pageIds);
      selectedIds = selectedIds.filter((id) => !pageSet.has(id));
      return;
    }
    selectedIds = Array.from(new Set([...selectedIds, ...pageIds]));
  }

  async function toggleStar(email: EmailDto) {
    if (pendingId === email.id) return;
    pendingId = email.id;
    try {
      const response = await fetch(`${apiHrefPrefix}/${encodeURIComponent(email.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'star' })
      });
      if (response.ok) {
        emails = emails.map((item) => (item.id === email.id ? { ...item, isStarred: !item.isStarred } : item));
      }
    } finally {
      pendingId = '';
    }
  }

  async function toggleRead(email: EmailDto) {
    if (pendingId === email.id) return;
    pendingId = email.id;
    const nextRead = !email.isRead;
    try {
      const response = await fetch(`${apiHrefPrefix}/${encodeURIComponent(email.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: nextRead ? 'read' : 'unread' })
      });
      if (response.ok) {
        emails = emails.map((item) => (item.id === email.id ? { ...item, isRead: nextRead } : item));
      }
    } finally {
      pendingId = '';
    }
  }

  async function removeEmail(emailId: string) {
    if (pendingId === emailId) return;
    pendingId = emailId;
    try {
      const response = await fetch(`${apiHrefPrefix}/${encodeURIComponent(emailId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'delete' })
      });
      if (response.ok) {
        emails = emails.filter((email) => email.id !== emailId);
        selectedIds = selectedIds.filter((id) => id !== emailId);
        toastStore.success('Email dipindahkan ke Sampah');
      }
    } finally {
      pendingId = '';
    }
  }

  async function restoreEmail(emailId: string) {
    if (pendingId === emailId) return;
    pendingId = emailId;
    try {
      const response = await fetch(`${apiHrefPrefix}/${encodeURIComponent(emailId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'untrash' })
      });
      if (response.ok) {
        trashEmails = trashEmails.filter((email) => email.id !== emailId);
        selectedIds = selectedIds.filter((id) => id !== emailId);
        toastStore.success('Email dipulihkan');
      }
    } finally {
      pendingId = '';
    }
  }

  async function bulkDelete() {
    if (bulkPending || selectionCount === 0 || activeView === 'trash') return;
    if (!confirm(`Pindahkan ${selectionCount} email ke Sampah?`)) return;
    bulkPending = true;
    try {
      const response = await fetch(`${apiHrefPrefix}/bulk`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' })
      });
      if (!response.ok) return;
      toastStore.success(`${selectedIds.length} email dipindahkan ke Sampah`);
      const removed = new Set(selectedIds);
      emails = emails.filter((email) => !removed.has(email.id));
      trashEmails = trashEmails.filter((email) => !removed.has(email.id));
      selectedIds = [];
      if (pageIndex > 0 && paginated.length === 0) pageIndex = Math.max(0, pageIndex - 1);
    } finally {
      bulkPending = false;
    }
  }

  async function bulkMarkRead(nextRead: boolean) {
    if (bulkPending || selectionCount === 0 || activeView === 'trash') return;
    bulkPending = true;
    try {
      const response = await fetch(`${apiHrefPrefix}/bulk`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: nextRead ? 'read' : 'unread' })
      });
      if (!response.ok) return;
      toastStore.success(nextRead ? 'Ditandai sudah dibaca' : 'Ditandai belum dibaca');
      const target = new Set(selectedIds);
      emails = emails.map((email) => (target.has(email.id) ? { ...email, isRead: nextRead } : email));
    } finally {
      bulkPending = false;
    }
  }

  async function emptyTrash() {
    if (emptyPending || !trashEmptyUrl || trashEmails.length === 0) return;
    if (!confirm(`Kosongkan Sampah? ${trashEmails.length} email akan dihapus permanen.`)) return;
    emptyPending = true;
    emptyError = '';
    try {
      const response = await fetch(trashEmptyUrl, { method: 'POST' });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        emptyError = payload.error ?? 'Gagal mengosongkan Sampah.';
        return;
      }
      trashEmails = [];
      emails = emails.filter((email) => !selectedSet.has(email.id));
      selectedIds = [];
      toastStore.success('Sampah dikosongkan');
    } finally {
      emptyPending = false;
    }
  }

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      await invalidateAll();
    } finally {
      refreshing = false;
    }
  }

  function timeLabel(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const sameDay =
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();
    if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sameYear = now.getFullYear() === date.getFullYear();
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  }

  function senderLabel(sender: string): string {
    const match = sender.match(/^([^<]+)/);
    return String(match ? match[1] : sender).replace(/"/g, '').trim();
  }
</script>

<div class="card">

    {#if activeView === 'trash'}
      <div class="trash-note">
        <Icon name="info" size={16} />
        <span>Pesan di Sampah otomatis dihapus permanen setelah <strong>30 hari</strong> sejak masuk Sampah.</span>
      </div>
      {#if emptyError}
        <p class="trash-error">{emptyError}</p>
      {/if}
    {/if}

    <div class="toolbar">
      <div class="tb-left">
        {#if activeView !== 'trash'}
          <span class="tb-select">
            <input
              class="cb"
              bind:this={selectAllEl}
              type="checkbox"
              checked={allPageSelected}
              aria-label="Pilih semua email di halaman ini"
              on:change={toggleSelectAll}
            />
          </span>
        {/if}
        {#if selectionCount > 0 && activeView !== 'trash'}
          <span class="sel-count">{nf.format(selectionCount)} dipilih</span>
          <button
            class="tb-btn"
            type="button"
            title={bulkReadAction === 'read' ? 'Tandai sudah dibaca' : 'Tandai belum dibaca'}
            aria-label={bulkReadAction === 'read' ? 'Tandai sudah dibaca' : 'Tandai belum dibaca'}
            on:click={() => bulkMarkRead(bulkReadAction === 'read')}
            disabled={bulkPending}
          >
            <Icon name={bulkReadAction === 'read' ? 'mark_email_read' : 'mark_email_unread'} size={18} />
          </button>
          <button class="tb-btn danger" type="button" title="Pindahkan ke Sampah" aria-label="Pindahkan yang dipilih ke Sampah" on:click={bulkDelete} disabled={bulkPending}>
            <Icon name="delete" size={18} />
          </button>
        {/if}
        {#if selectionCount === 0}
          <button class="tb-btn" type="button" title="Muat ulang" aria-label="Muat ulang" on:click={refresh} disabled={refreshing}>
            <span class:spin={refreshing}><Icon name="refresh" size={18} /></span>
          </button>
        {/if}
        {#if activeView === 'trash' && trashEmptyUrl}
          <button
            class="tb-btn-text danger"
            type="button"
            on:click={emptyTrash}
            disabled={emptyPending || trashEmails.length === 0}
          >
            Kosongkan Sampah
          </button>
        {/if}
      </div>
      <div class="tb-right">
        <span class="range">{nf.format(rangeStart)}–{nf.format(rangeEnd)} dari {nf.format(displayed.length)}</span>
        <button class="tb-btn" type="button" title="Halaman sebelumnya" aria-label="Halaman sebelumnya" disabled={pageIndex === 0} on:click={() => (pageIndex = Math.max(0, pageIndex - 1))}>
          <Icon name="chevron_left" size={18} />
        </button>
        <button class="tb-btn" type="button" title="Halaman berikutnya" aria-label="Halaman berikutnya" disabled={pageIndex >= totalPages - 1} on:click={() => (pageIndex = Math.min(totalPages - 1, pageIndex + 1))}>
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </div>

  {#if displayed.length === 0}
    <div class="empty">Tidak ada email.</div>
  {:else}
    <div class="rows">
      {#each paginated as email (email.id)}
        <MailRow
          href={`${emailHrefPrefix}/${email.id}${viewSuffix}`}
          sender={senderLabel(email.sender)}
          subject={email.subject}
          snippet={email.snippet}
          receivedAt={timeLabel(email.receivedAt)}
          isRead={email.isRead}
          isStarred={email.isStarred}
          showLeading={activeView !== 'trash'}
          showActions={true}
          selected={selectedSet.has(email.id)}
        >
          <svelte:fragment slot="leading">
            {#if activeView !== 'trash'}
              <input
                class="cb"
                type="checkbox"
                checked={selectedSet.has(email.id)}
                aria-label={`Pilih email dari ${senderLabel(email.sender)}`}
                on:change={() => toggleSelect(email.id)}
              />
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="star">
            <button
              class="star"
              class:on={email.isStarred}
              type="button"
              title={email.isStarred ? 'Hapus bintang' : 'Beri bintang'}
              aria-label={email.isStarred ? 'Hapus bintang' : 'Beri bintang'}
              on:click={() => toggleStar(email)}
              disabled={pendingId === email.id}
            >
              <svg
                class="star-svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={email.isStarred ? 'currentColor' : 'none'}
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.35l-5.7 3-1.09-6.34-4.62-4.5 6.38-.93z" />
              </svg>
            </button>
          </svelte:fragment>
          <svelte:fragment slot="actions">
            {#if activeView === 'trash'}
              <button class="q-btn" type="button" title="Pulihkan" aria-label="Pulihkan" on:click={() => restoreEmail(email.id)} disabled={pendingId === email.id}>
                <Icon name="restore" size={18} />
              </button>
            {:else}
              <button
                class="q-btn"
                type="button"
                title={email.isRead ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}
                aria-label={email.isRead ? 'Tandai belum dibaca' : 'Tandai sudah dibaca'}
                on:click={() => toggleRead(email)}
                disabled={pendingId === email.id}
              >
                <Icon name={email.isRead ? 'mark_email_unread' : 'mark_email_read'} size={18} />
              </button>
              <button class="q-btn danger" type="button" title="Pindahkan ke Sampah" aria-label="Pindahkan ke Sampah" on:click={() => removeEmail(email.id)} disabled={pendingId === email.id}>
                <Icon name="delete" size={18} />
              </button>
            {/if}
          </svelte:fragment>
        </MailRow>
      {/each}
    </div>
  {/if}
</div>

<style>
  .card {
    background: var(--gm-bg);
    border: 1px solid var(--gm-border);
    border-radius: 16px;
    overflow: hidden;
    color: var(--gm-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  .trash-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    background: var(--gm-surface-2);
    border-bottom: 1px solid var(--gm-line);
    color: var(--gm-muted);
    font-size: 0.82rem;
  }

  .trash-note strong {
    color: var(--gm-text);
  }

  .trash-error {
    margin: 0;
    padding: 0.4rem 0.75rem;
    color: var(--gm-danger);
    font-size: 0.8rem;
    background: var(--gm-danger-soft);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.55rem 1rem 0.55rem 0.6rem;
    border-bottom: 1px solid var(--gm-line);
  }

  .tb-select {
    width: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
  }

  .tb-left,
  .tb-right {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tb-btn {
    background: transparent;
    border: 0;
    color: var(--gm-muted);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .tb-btn:hover:not(:disabled) {
    background: var(--gm-line);
  }

  .tb-btn:disabled {
    color: #dadce0;
    cursor: default;
  }

  .tb-btn-text {
    border: 1px solid var(--gm-danger);
    background: transparent;
    color: var(--gm-danger);
    border-radius: 9999px;
    padding: 0.3rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .tb-btn-text:hover:not(:disabled) {
    background: var(--gm-danger-soft);
  }

  .tb-btn-text:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .tb-btn.danger:hover:not(:disabled) {
    background: var(--gm-danger-soft);
    color: var(--gm-danger);
  }

  .range {
    font-size: 0.78rem;
    color: var(--gm-muted);
    margin-right: 0.5rem;
    white-space: nowrap;
  }

  .sel-count {
    font-size: 0.8rem;
    color: var(--gm-text);
    font-weight: 600;
    white-space: nowrap;
  }

  .rows {
    display: block;
  }

  .row {
    display: grid;
    grid-template-columns: 26px 26px minmax(0, 1fr) 96px 84px;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 1rem 0.45rem 0.6rem;
    border-bottom: 1px solid var(--gm-line);
    font-size: 0.875rem;
    color: var(--gm-text);
  }

  .row:hover {
    background: var(--gm-surface-2);
  }

  .row.selected {
    background: var(--gm-selected);
  }

  .row.unread {
    font-weight: 700;
  }

  .cb,
  .cb-space {
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .cb {
    accent-color: var(--gm-blue);
    display: block;
  }

  .cb-space {
    display: block;
  }

  .star {
    background: transparent;
    border: 0;
    color: var(--gm-star-off);
    cursor: pointer;
    display: inline-flex;
    padding: 0.2rem;
  }

  .star:hover:not(:disabled) {
    color: var(--gm-star-hover);
  }

  .star.on {
    color: var(--gm-blue);
  }

  .star.on:hover:not(:disabled) {
    color: var(--gm-blue);
  }

  .star-svg {
    display: block;
  }

  .row-link {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    gap: 0.75rem;
    padding-left: 0.15rem;
    align-items: baseline;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }

  .sender {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subject {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .snippet {
    color: var(--gm-muted);
    font-weight: 400;
  }

  .time {
    font-size: 0.78rem;
    color: var(--gm-muted);
    text-align: right;
    white-space: nowrap;
  }

  .row.unread .time {
    color: var(--gm-text);
  }

  .quick {
    display: flex;
    justify-content: flex-end;
    gap: 0.15rem;
    padding-right: 0.15rem;
    visibility: hidden;
  }

  .row:hover .quick {
    visibility: visible;
  }

  .q-btn {
    background: transparent;
    border: 0;
    color: var(--gm-muted);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .q-btn:hover {
    background: var(--gm-line);
  }

  .q-btn.danger:hover {
    color: var(--gm-danger);
  }

  .spin {
    display: inline-flex;
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .empty {
    padding: 4rem 1rem;
    text-align: center;
    color: var(--gm-muted);
    font-size: 0.9rem;
  }

  @media (max-width: 720px) {
    .card {
      border-radius: 0 0 12px 12px;
      border-left: 0;
      border-right: 0;
    }

    .toolbar {
      padding: 0.45rem 0.85rem;
      position: sticky;
      top: 0;
      background: var(--gm-bg);
      z-index: 5;
    }

    .row {
      grid-template-columns: 24px 24px minmax(0, 1fr) auto;
      align-items: start;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem 0.65rem 0.5rem;
    }

    .row-link {
      grid-template-columns: 1fr;
      gap: 0.15rem;
    }

    .sender {
      font-size: 0.9rem;
    }

    .subject {
      font-size: 0.83rem;
      font-weight: 400;
      color: var(--gm-text);
    }

    .row.unread .subject {
      font-weight: 700;
      color: var(--gm-text);
    }

    .time {
      text-align: right;
      font-size: 0.72rem;
      padding-top: 2px;
    }

    .star,
    .cb {
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .star {
      padding: 0;
    }

    .quick {
      display: none;
    }

    .range {
      display: none;
    }
  }
</style>