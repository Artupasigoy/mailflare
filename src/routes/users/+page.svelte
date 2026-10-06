<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import AppSidebar from '$lib/components/organisms/AppSidebar.svelte';
  import AppTopbar from '$lib/components/organisms/AppTopbar.svelte';
  import UserListPanel from '$lib/components/organisms/UserListPanel.svelte';
  import SearchSortBar from '$lib/components/molecules/SearchSortBar.svelte';
  import StatusFilter from '$lib/components/molecules/StatusFilter.svelte';
  import LabelFilter from '$lib/components/molecules/LabelFilter.svelte';
  import LabelManagerModal from '$lib/components/organisms/LabelManagerModal.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import { page, navigating } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { sidebarCollapsed } from '$lib/stores/ui.store';
  import type { PageData } from './$types';

  export let data: PageData;
  $: adminEmail = $page.data.sessionEmail ?? null;

  let labelManagerOpen = false;
  let searchQuery = data.search ?? '';

  // Pagination & pencarian ditangani server (hemat kuota: tidak ambil semua user).
  $: filteredUsers = data.users;

  afterNavigate(({ to }) => {
    const next = to?.url.searchParams.get('q') ?? '';
    if (next !== searchQuery) {
      searchQuery = next;
    }
  });

  function handleSearch() {
    const q = searchQuery.trim();
    const trimmed = q.length >= 2 ? q : '';
    void goto(`/users${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true
    });
  }

  $: isTrashView = (data.status ?? 'all') === 'deleted';

  $: SORT_OPTIONS = isTrashView
    ? [
        { key: 'deleted_recent', label: 'Sampah terbaru' },
        { key: 'oldest', label: 'Sampah terlama' },
        { key: 'most_emails', label: 'Pesan terbanyak' },
        { key: 'name', label: 'Nama A-Z' }
      ]
    : [
        { key: 'newest', label: 'User terbaru' },
        { key: 'latest_email', label: 'Email terbaru' },
        { key: 'oldest', label: 'User terlama' },
        { key: 'most_emails', label: 'Pesan terbanyak' },
        { key: 'name', label: 'Nama A-Z' }
      ];

  $: STATUS_OPTIONS = [
    { key: 'all', label: 'Semua', count: data.totalAll ?? 0 },
    { key: 'active', label: 'Aktif', count: data.totalActive ?? 0 },
    { key: 'deleted', label: 'Sampah', count: data.totalDeleted ?? 0 }
  ];

  function applyStatus(next: string) {
    const params = new URLSearchParams($page.url.search);
    if (next === 'all') {
      params.delete('status');
    } else {
      params.set('status', next);
    }
    params.delete('page');
    if (next === 'deleted') {
      params.set('sort', 'deleted_recent');
    } else {
      params.delete('sort');
    }
    const queryString = params.toString();
    void goto(`/users${queryString ? `?${queryString}` : ''}`, { keepFocus: true, noScroll: true });
  }

  function applyLabel(next: string) {
    const params = new URLSearchParams($page.url.search);
    if (next) {
      params.set('label', next);
    } else {
      params.delete('label');
    }
    params.delete('page');
    const queryString = params.toString();
    void goto(`/users${queryString ? `?${queryString}` : ''}`, { keepFocus: true, noScroll: true });
  }

  function applySort(next: string) {
    const params = new URLSearchParams($page.url.search);
    const defaultSort = (data.status ?? 'all') === 'deleted' ? 'deleted_recent' : 'newest';
    if (next === defaultSort) {
      params.delete('sort');
    } else {
      params.set('sort', next);
    }
    params.delete('page');
    const queryString = params.toString();
    void goto(`/users${queryString ? `?${queryString}` : ''}`, { keepFocus: true, noScroll: true });
  }

  function goPage(next: number) {
    const params = new URLSearchParams($page.url.search);
    params.set('page', String(next));
    void goto(`/users?${params.toString()}`, { keepFocus: true, noScroll: true });
  }


  async function handleUserCreated() {
    await invalidateAll();
  }

  async function handleUserChanged() {
    await invalidateAll();
  }

  async function handleLabelsChanged() {
    await invalidateAll();
  }
</script>

<div class="layout-shell">
  <AppSidebar active="users" adminEmail={adminEmail} />
  <section class="main" class:sidebar-collapsed={$sidebarCollapsed}>
    <AppTopbar
      title="User List"
      variant="minimal"
      showSearch={false}
      showRefresh={false}
      showLogout={false}
    />
    <div class="content">
      {#if $navigating}
        <p class="loading-hint" role="status">Memuat data...</p>
      {/if}
      <SearchSortBar
        bind:searchQuery
        searchPlaceholder="Cari nama atau email user..."
        onSearch={handleSearch}
        sort={data.sort ?? 'newest'}
        sortOptions={SORT_OPTIONS}
        onSort={applySort}
      />

      <div class="status-row">
        <StatusFilter value={data.status ?? 'all'} options={STATUS_OPTIONS} onChange={applyStatus} />
        <LabelFilter
          labels={data.labels ?? []}
          value={data.labelId ?? ''}
          onChange={applyLabel}
          onManage={() => (labelManagerOpen = true)}
        />
      </div>
      {#if isTrashView}
        <div class="trash-row">
          <span class="trash-hint">
            <Icon name="info" size={15} />
            User di Sampah tidak bisa login. Emailnya tetap tersimpan dan bisa dibuka dengan klik email user. User di Sampah bisa dipulihkan, atau dihapus permanen (sendiri/semua) — dan otomatis terhapus setelah 30 hari.
          </span>
        </div>
      {/if}
      <UserListPanel
        users={filteredUsers}
        total={data.total ?? 0}
        page={data.page ?? 1}
        pageSize={data.pageSize ?? 20}
        onPage={goPage}
        on:usercreated={handleUserCreated}
        on:userchanged={handleUserChanged}
        trashView={isTrashView}
        labels={data.labels ?? []}
      />
    </div>
  </section>
</div>

<LabelManagerModal
  open={labelManagerOpen}
  labels={data.labels ?? []}
  on:close={() => (labelManagerOpen = false)}
  on:changed={handleLabelsChanged}
/>

<style>
  .status-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    margin-bottom: var(--space-3);
  }

  .trash-row {
    margin-bottom: var(--space-3);
  }

  .trash-hint {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--color-text-muted);
    flex: 1;
    min-width: 16rem;
  }


  .content {
    padding: var(--space-5);
  }

  .loading-hint {
    margin: 0 0 var(--space-3);
    font-size: 0.82rem;
    color: var(--color-primary-500);
    font-weight: 600;
  }

  @media (max-width: 960px) {
    .content {
      padding: var(--space-4) var(--space-3);
    }
  }
</style>
