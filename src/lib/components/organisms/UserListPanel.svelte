<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { UserDto } from '$lib/types/dto';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Badge from '$lib/components/atoms/Badge.svelte';
  import Avatar from '$lib/components/atoms/Avatar.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import InputText from '$lib/components/atoms/InputText.svelte';
  import Pager from '$lib/components/molecules/Pager.svelte';
  import { toastStore } from '$lib/stores/toast.store';

  export let users: UserDto[] = [];
  export let total = 0;
  export let page = 1;
  export let pageSize = 20;
  export let trashView = false;
  export let onPage: ((next: number) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{ usercreated: void; userchanged: void }>();

  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (bulkPending || isSubmitting) return;
      modalOpen = false;
      bulkModalOpen = false;
      resetForm();
      bulkCredentials = [];
      bulkSkipped = [];
    }
  }


  let modalOpen = false;
  let username = '';
  let isSubmitting = false;
  let actionUserId = '';
  let errorMessage = '';
  let copyMessage = '';
  let listMessage = '';
  let credentialContext: 'create' | 'reset' | 'bulk' | 'restore' = 'create';

  // Bulk create / bulk delete
  let selectedIds: string[] = [];
  let bulkPending = false;
  let bulkModalOpen = false;
  let bulkUsernames = '';
  let bulkPasswordMode: 'random' | 'same' = 'random';
  let bulkSharedPassword = '';
  let bulkErrors: string[] = [];
  let bulkCredentials: Array<{ username: string; email: string; password: string }> = [];
  let bulkSkipped: string[] = [];
  let bulkMode: 'create' | 'restore' = 'create';
  let selectAllEl: HTMLInputElement | undefined;
  let allSelected = false;
  let generatedCredentials: {
    username: string;
    email: string;
    password: string;
  } | null = null;

  // Pilihan bersifat per-halaman: kalau daftar berubah (pindah halaman / cari / refresh),
  // id yang tidak ada di halaman ini dibuang agar tidak ada "pilatan tersembunyi".
  $: selectableUsers = users.filter((user) => user.role !== 'owner');
  $: selectableIds = selectableUsers.map((user) => user.id);
  $: selectedSet = new Set(selectedIds);
  $: selectedOnPage = selectableIds.filter((id) => selectedSet.has(id)).length;
  $: allSelected = selectableIds.length > 0 && selectedOnPage === selectableIds.length;
  $: someSelected = selectedOnPage > 0 && !allSelected;
  $: selectedDisabled = users.filter((user) => selectedSet.has(user.id) && user.status !== 'active').length;
  $: selectedActive = users.filter((user) => selectedSet.has(user.id) && user.status === 'active').length;
  $: selectedPermanent = users.filter((user) => selectedSet.has(user.id)).length;

  $: if (selectAllEl) {
    selectAllEl.indeterminate = someSelected;
  }

  // Prune pilihan yang tidak ada di halaman ini.
  $: {
    const allowed = new Set(selectableIds);
    const pruned = selectedIds.filter((id) => allowed.has(id));
    if (pruned.length !== selectedIds.length) {
      selectedIds = pruned;
    }
  }

  function formatRelative(value: string): string {
    if (!value) return '-';
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '-';
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'baru saja';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} menit`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam`;
    return `${Math.floor(diff / 86_400_000)} hari`;
  }

  function formatCount(value: number | undefined) {
    return Number(value ?? 0).toLocaleString();
  }

  function toggleSelect(id: string) {
    selectedIds = selectedSet.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
  }

  function toggleSelectAll() {
    selectedIds = allSelected ? [] : [...selectableIds];
  }

  async function handleBulkSoftDelete() {
    if (bulkPending || selectedIds.length === 0 || selectedActive === 0) return;
    if (
      !confirm(
        `Pindahkan ${selectedActive} user ke Sampah?\n\nUser tidak bisa login, email tetap tersimpan, dan bisa dipulihkan selama 30 hari.`
      )
    ) {
      return;
    }
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'softDelete', userIds: selectedIds })
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; softDeleted?: number; skipped?: Array<{ email: string; reason: string }> }
        | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menghapus user.';
        return;
      }
      const skipped = payload?.skipped ?? [];
      listMessage = `${payload?.softDeleted ?? 0} user dipindahkan ke Sampah${
        skipped.length ? ` (${skipped.length} dilewati: ${skipped.map((i) => i.reason).join('; ')})` : ''
      }.`;
      toastStore.success(`${payload?.softDeleted ?? 0} user dipindahkan ke Sampah`);
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleBulkDelete() {
    if (bulkPending || selectedIds.length === 0) return;
    if (selectedPermanent === 0) {
      return;
    }
    if (!confirm(`Hapus permanen ${selectedPermanent} user beserta emailnya? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'delete', userIds: selectedIds })
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; deleted?: number; skipped?: Array<{ email: string; reason: string }> }
        | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menghapus user.';
        return;
      }
      const skipped = payload?.skipped ?? [];
      const skipText = skipped.length
        ? ` (${skipped.length} dilewati: ${skipped.map((item) => `${item.email} — ${item.reason}`).join('; ')})`
        : '';
      listMessage = `${payload?.deleted ?? 0} user dihapus${skipText}.`;
      toastStore.success('User dihapus permanen');
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleRestore(user: UserDto) {
    if (bulkPending || user.role === 'owner') return;
    if (!confirm(`Pulihkan ${user.email}? Password baru akan dibuat.`)) return;
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ restore: true })
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; password?: string; user?: { email?: string } }
        | null;
      if (!response.ok || !payload?.password) {
        listMessage = payload?.error ?? 'Gagal memulihkan user.';
        return;
      }
      generatedCredentials = {
        username: user.displayName,
        email: payload.user?.email ?? user.email,
        password: payload.password
      };
      credentialContext = 'restore';
      toastStore.success('User dipulihkan');
      modalOpen = true;
      selectedIds = selectedIds.filter((id) => id !== user.id);
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleBulkRestore() {
    if (bulkPending || selectedIds.length === 0) return;
    if (!confirm(`Pulihkan ${selectedIds.length} user terpilih?`)) return;
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'restore', userIds: selectedIds })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            restored?: Array<{ email: string; password: string }>;
            skipped?: Array<{ email: string; reason: string }>;
          }
        | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal memulihkan user.';
        return;
      }
      const restored = payload?.restored ?? [];
      if (restored.length > 0) {
        bulkCredentials = restored.map((item) => ({
          username: item.email.split('@')[0] ?? item.email,
          email: item.email,
          password: item.password
        }));
        bulkModalOpen = true;
      }
      const skipped = payload?.skipped ?? [];
      listMessage = `${restored.length} user dipulihkan${skipped.length ? `, ${skipped.length} dilewati` : ''}.`;
      toastStore.success('User dipulihkan');
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  function openBulkModal() {
    bulkMode = 'create';
    bulkModalOpen = true;
    bulkUsernames = '';
    bulkErrors = [];
    bulkCredentials = [];
    bulkSkipped = [];
  }

  function closeBulkModal() {
    if (bulkPending) return;
    bulkModalOpen = false;
  }

  async function handleBulkCreate() {
    if (bulkPending) return;
    bulkPending = true;
    bulkErrors = [];
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'create',
          usernames: bulkUsernames,
          ...(bulkPasswordMode === 'same' && bulkSharedPassword.trim() ? { password: bulkSharedPassword.trim() } : {})
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            credentials?: Array<{ username: string; email: string; password: string }>;
            skipped?: Array<{ email: string; reason: string }>;
            invalid?: Array<{ username: string; reason: string }>;
          }
        | null;
      if (!response.ok) {
        bulkErrors = [payload?.error ?? 'Gagal membuat user.'];
        return;
      }
      bulkCredentials = payload?.credentials ?? [];
      toastStore.success(`${(payload?.credentials ?? []).length} user dibuat`);
      bulkSkipped = [
        ...(payload?.skipped ?? []).map((item) => `${item.email} — ${item.reason}`),
        ...(payload?.invalid ?? []).map((item) => `${item.username} — ${item.reason}`)
      ];
      bulkUsernames = '';
      if (bulkCredentials.length > 0) {
        dispatch('usercreated');
        dispatch('userchanged');
      } else if (bulkSkipped.length > 0) {
        bulkErrors = bulkSkipped;
      }
    } catch {
      bulkErrors = ['Gagal menghubungi server.'];
    } finally {
      bulkPending = false;
    }
  }

  async function copyBulkAll() {
    const text = bulkCredentials.map((item) => `${item.email} | ${item.password}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copyMessage = 'Semua kredensial disalin.';
      toastStore.success('Semua kredensial disalin');
    } catch {
      copyMessage = 'Gagal menyalin. Salin manual.';
    }
  }

  function openModal() {
    modalOpen = true;
    resetForm();
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }
    modalOpen = false;
    resetForm();
  }

  function resetForm() {
    username = '';
    errorMessage = '';
    copyMessage = '';
    generatedCredentials = null;
    credentialContext = 'create';
  }

  async function handleCreateUser() {
    if (isSubmitting) {
      return;
    }

    errorMessage = '';
    isSubmitting = true;

    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      errorMessage = 'Username wajib diisi.';
      isSubmitting = false;
      return;
    }
    if (normalized.length < 3 || normalized.length > 64) {
      errorMessage = 'Username harus 3-64 karakter.';
      isSubmitting = false;
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(normalized)) {
      errorMessage = 'Username hanya boleh a-z, 0-9, titik, underscore, dan hyphen.';
      isSubmitting = false;
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: normalized
        })
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            credentials?: {
              username: string;
              email: string;
              password: string;
            };
          }
        | null;
      if (!response.ok) {
        errorMessage = payload?.error ?? 'Gagal membuat user.';
        return;
      }

      if (!payload?.credentials) {
        errorMessage = 'User dibuat tapi kredensial tidak diterima server.';
        return;
      }

      generatedCredentials = payload.credentials;
      credentialContext = 'create';
      toastStore.success('User baru dibuat');
      username = '';
      dispatch('usercreated');
      dispatch('userchanged');
    } catch {
      errorMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      isSubmitting = false;
    }
  }

  async function copyValue(label: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      copyMessage = `${label} copied.`;
    } catch {
      copyMessage = 'Gagal menyalin. Salin manual.';
    }
  }

  async function handleQuickCopyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      listMessage = 'Email disalin.';
      toastStore.success('Email disalin');
    } catch {
      listMessage = 'Gagal menyalin email.';
      toastStore.error('Gagal menyalin email');
    }
  }

  async function handleQuickResetPassword(user: UserDto) {
    if (isSubmitting || actionUserId) {
      return;
    }
    if (!confirm(`Reset password untuk ${user.email}?`)) {
      return;
    }

    errorMessage = '';
    listMessage = '';
    actionUserId = user.id;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetPassword: true })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; password?: string } | null;

      if (!response.ok || !payload?.password) {
        listMessage = payload?.error ?? 'Gagal reset password.';
        return;
      }

      generatedCredentials = {
        username: user.displayName,
        email: user.email,
        password: payload.password
      };
      copyMessage = '';
      credentialContext = 'reset';
      toastStore.success('Password baru dibuat');
      modalOpen = true;
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      actionUserId = '';
    }
  }

  async function handlePermanentDelete(user: UserDto) {
    if (actionUserId) return;
    if (!confirm(`Hapus permanen ${user.email} beserta emailnya? Tindakan ini tidak bisa dibatalkan.`)) return;
    actionUserId = user.id;
    listMessage = '';
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'x-mailflare-confirm': 'delete-user' }
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menghapus permanen.';
        return;
      }
      listMessage = `${user.email} dihapus permanen.`;
      toastStore.success('User dihapus permanen');
      selectedIds = selectedIds.filter((id) => id !== user.id);
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      actionUserId = '';
    }
  }

  async function handleEmptyTrash() {
    if (bulkPending) return;
    if (!confirm('Kosongkan Sampah? Semua user di Sampah dihapus permanen beserta emailnya. Tindakan ini tidak bisa dibatalkan.')) return;
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'emptyTrash' })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; deleted?: number } | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal mengosongkan Sampah.';
        return;
      }
      listMessage = `Sampah dikosongkan. ${payload?.deleted ?? 0} user dihapus permanen.`;
      toastStore.success('Sampah dikosongkan');
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleQuickSoftDelete(user: UserDto) {
    if (isSubmitting || actionUserId) {
      return;
    }
    if (user.role === 'owner') {
      listMessage = 'Akun owner tidak bisa dihapus.';
      return;
    }
    if (!confirm(`Pindahkan user ${user.email} ke Sampah? User tidak bisa login, email tetap tersimpan, bisa dipulihkan selama 30 hari.`)) {
      return;
    }

    errorMessage = '';
    listMessage = '';
    actionUserId = user.id;

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'x-mailflare-confirm': 'soft-delete-user'
        }
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menghapus user.';
        return;
      }

      listMessage = `${user.email} masuk Sampah.`;
      toastStore.success('User dipindahkan ke Sampah');
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      actionUserId = '';
    }
  }
</script>

<svelte:window on:keydown={handleModalKeydown} />

<CardSurface>
  <div class="panel-header">
    <div>
      <h2>Manajemen User</h2>
      <p class="text-muted">Daftar semua user beserta peran dan statusnya.</p>
    </div>
    {#if !trashView}
      <div class="header-actions">
        <Button variant="secondary" on:click={openBulkModal}>
          <Icon name="group_add" size={18} />
          Buat Massal
        </Button>
        <Button on:click={openModal}>
          <Icon name="person_add" size={18} />
          Tambah User
        </Button>
      </div>
    {/if}
  </div>
  {#if listMessage}
    <p class="text-muted list-feedback">{listMessage}</p>
  {/if}

  {#if users.length === 0}
    <div class="empty">
      <Icon name={trashView ? "delete" : "person_off"} size={38} />
      <h3>{trashView ? 'Sampah kosong.' : 'Belum ada user.'}</h3>
      <p class="text-muted">{trashView ? 'User yang dihapus akan muncul di sini.' : 'Mulai kelola tim Anda dengan menambahkan user pertama.'}</p>
    </div>
  {:else}
    <div class="bulk-toolbar">
      <label class="select-all">
        <input bind:this={selectAllEl} type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
        <span>Pilih semua</span>
      </label>
      <span class="text-muted">
        {selectedIds.length > 0
          ? `${selectedIds.length} dipilih${selectedOnPage < selectedIds.length ? ` (${selectedOnPage} di halaman ini)` : ''}`
          : `${selectableUsers.length} user dapat dipilih`}
      </span>
      {#if !trashView && selectedActive > 0}
        <button class="bulk-btn" type="button" disabled={bulkPending} on:click={handleBulkSoftDelete}>
          <Icon name="person_remove" size={16} />
          Pindahkan ke Sampah ({selectedActive})
        </button>
      {/if}
      {#if selectedDisabled > 0}
        <button
          class="bulk-btn"
          type="button"
          disabled={bulkPending}
          on:click={handleBulkRestore}
        >
          <Icon name="restore" size={16} />
          Pulihkan ({selectedDisabled})
        </button>
      {/if}
      {#if trashView && selectedPermanent > 0}
        <button
          class="bulk-btn danger"
          type="button"
          disabled={bulkPending}
          on:click={handleBulkDelete}
        >
          <Icon name="delete" size={16} />
          Hapus Permanen ({selectedPermanent})
        </button>
      {/if}
      {#if trashView}
        <button
          class="bulk-btn danger"
          type="button"
          disabled={bulkPending}
          on:click={handleEmptyTrash}
        >
          <Icon name="delete_forever" size={16} />
          Kosongkan Sampah
        </button>
      {/if}
    </div>

    <div class="list">
      {#each users as user (user.id)}
        <div class={`row ${selectedSet.has(user.id) ? 'selected' : ''}`}>
          <span class="row-select">
            <input
              type="checkbox"
              checked={selectedSet.has(user.id)}
              disabled={user.role === 'owner'}
              aria-label={`Pilih ${user.email}`}
              on:change={() => toggleSelect(user.id)}
            />
          </span>
          <a href={`/users/${user.id}/inbox`} class="identity-link" title="Buka inbox user ini">
            <Avatar initials={user.displayName.slice(0, 2).toUpperCase()} />
            <div class="identity-text">
              <div class="name">{user.displayName}</div>
              <div class="text-muted">{user.email}</div>
              <div class="text-muted identity-metrics">
                <span>Email: {formatCount(user.totalEmails)}</span>
                <span>Unread: {formatCount(user.unreadEmails)}</span>
              </div>
              {#if user.latestEmail}
                <div class="latest-email">
                  <Icon name="mail" size={14} />
                  <span class="latest-subject">{user.latestEmail.subject || '(Tanpa subjek)'}</span>
                  <span class="text-muted latest-meta">
                    {formatRelative(user.latestEmail.receivedAt)}
                  </span>
                </div>
              {:else}
                <div class="latest-email is-empty">
                  <span class="latest-icon" aria-hidden="true"><Icon name="mail" size={14} /></span>
                  <span class="latest-subject">Belum ada email masuk</span>
                </div>
              {/if}
            </div>
          </a>
          <div class="meta">
            <Badge tone={user.status === 'active' ? 'success' : 'warning'}>
              {user.status === 'active' ? 'Aktif' : 'Sampah'}
            </Badge>
            {#if user.deletedAt}
              <span class="text-muted deleted-at" title="Dihapus pada {user.deletedAt}">
                {formatRelative(user.deletedAt)} lalu
              </span>
            {/if}
            <span class="role">{user.role}</span>
            <div class="quick-actions">
              <button class="icon-action" type="button" aria-label="Copy email" title="Copy email" on:click={() => handleQuickCopyEmail(user.email)}>
                <Icon name="content_copy" size={16} />
              </button>
              {#if !trashView}
              <button
                class="icon-action"
                type="button"
                aria-label="Reset password"
                title="Reset password"
                disabled={actionUserId === user.id || user.status !== 'active'}
                on:click={() => handleQuickResetPassword(user)}
              >
                <Icon name="lock_reset" size={16} />
              </button>
              {/if}
              {#if !trashView && user.status === 'active'}
                <button
                  class="icon-action danger"
                  type="button"
                  aria-label="Pindahkan ke Sampah"
                  title="Pindahkan ke Sampah (bisa dipulihkan 30 hari)"
                  disabled={actionUserId === user.id || user.role === 'owner'}
                  on:click={() => handleQuickSoftDelete(user)}
                >
                  <Icon name="person_remove" size={16} />
                </button>
              {:else if user.role !== 'owner'}
                {#if user.status !== 'active'}
                <button
                  class="icon-action"
                  type="button"
                  aria-label="Pulihkan user"
                  title="Pulihkan user"
                  disabled={bulkPending}
                  on:click={() => handleRestore(user)}
                >
                  <Icon name="restore" size={16} />
                </button>
                {/if}
                {#if trashView}
                <button
                  class="icon-action danger"
                  type="button"
                  aria-label="Hapus permanen"
                  title="Hapus permanen"
                  disabled={actionUserId === user.id}
                  on:click={() => handlePermanentDelete(user)}
                >
                  <Icon name="delete_forever" size={16} />
                </button>
                {/if}
              {/if}
            </div>
            {#if !trashView}<Button href={`/users/${user.id}/edit`} variant="ghost">Edit</Button>{/if}
          </div>
        </div>
      {/each}
    </div>

    <Pager
      {page}
      {pageSize}
      {total}
      {onPage}
      label={selectedIds.length > 0 ? `${selectedIds.length} dipilih` : ''}
    />
  {/if}
</CardSurface>

{#if bulkModalOpen}
  <button class="modal-backdrop" type="button" aria-label="Close bulk create modal" on:click={closeBulkModal}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="bulk-create-title">
    <div class="modal-card">
      <div class="modal-head">
        <h3 id="bulk-create-title">Buat User Massal</h3>
        <p class="text-muted">Satu username per baris (atau dipisah spasi/koma). Maks 100 user.</p>
      </div>

      {#if bulkCredentials.length === 0}
        <form class="modal-body modal-form" on:submit|preventDefault={handleBulkCreate}>
        <div class="field">
          <label for="bulk-usernames">Daftar username</label>
          <textarea
            id="bulk-usernames"
            class="bulk-textarea"
            rows="8"
            bind:value={bulkUsernames}
            placeholder={'andi\nbudi\nsiti'}
          ></textarea>
        </div>

        <div class="field">
          <label for="bulk-password-mode">Password</label>
          <select id="bulk-password-mode" class="bulk-select" bind:value={bulkPasswordMode}>
            <option value="random">Acak (berbeda untuk tiap user)</option>
            <option value="same">Sama untuk semua user</option>
          </select>
        </div>

        {#if bulkPasswordMode === 'same'}
          <div class="field">
            <label for="bulk-shared-password">Password bersama</label>
            <InputText id="bulk-shared-password" bind:value={bulkSharedPassword} placeholder="Minimal 8 karakter" type="text" />
          </div>
        {/if}

        {#if bulkErrors.length > 0}
          <ul class="bulk-errors">
            {#each bulkErrors as item (item)}
              <li>{item}</li>
            {/each}
          </ul>
        {/if}

        <div class="modal-footer">
          <button class="btn-cancel" type="button" disabled={bulkPending} on:click={closeBulkModal}>Batal</button>
          <button class="btn-submit signature-bg" type="submit" disabled={bulkPending || bulkUsernames.trim().length === 0}>
            {bulkPending ? 'Membuat...' : 'Buat User'}
          </button>
        </div>
        </form>
      {:else}
        <div class="modal-body">
        <p class="text-muted">{bulkCredentials.length} user berhasil dibuat{bulkSkipped.length > 0 ? `, ${bulkSkipped.length} dilewati` : ""}.</p>

        <div class="bulk-result">
          {#each bulkCredentials as item (item.email)}
            <div class="bulk-result-row">
              <code>{item.email}</code>
              <code>{item.password}</code>
              <button
                class="icon-action"
                type="button"
                aria-label="Copy credentials"
                on:click={() => copyValue(item.email, item.password)}
              >
                <Icon name="content_copy" size={16} />
              </button>
            </div>
          {/each}
        </div>

        {#if bulkSkipped.length > 0}
          <p class="text-muted">Dilewati: {bulkSkipped.join('; ')}</p>
        {/if}
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" type="button" on:click={copyBulkAll}>Copy semua</button>
          <button
            class="btn-submit signature-bg"
            type="button"
            on:click={() => {
              bulkCredentials = [];
              bulkSkipped = [];
            }}
          >Tutup</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if modalOpen}
  <button class="modal-backdrop" type="button" aria-label="Close add user modal" on:click={closeModal}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
    <div class={`modal-card ${generatedCredentials ? 'modal-success' : ''}`}>
      {#if generatedCredentials}
        <div class="top-accent"></div>
      {:else}
        <div class="modal-head">
          <h3 id="add-user-title">Tambah User</h3>
          <p class="text-muted">Buat akun user baru dengan kredensial otomatis.</p>
        </div>
      {/if}

      {#if generatedCredentials}
        <div class="modal-body credentials-pane">
          <div class="success-head">
            <div class="success-icon-wrap">
              <Icon name="check_circle" size={36} />
            </div>
            <h3 class="success-title">
              {credentialContext === 'restore' ? 'User dipulihkan' : 'Berhasil!'}
            </h3>
            {#if credentialContext === 'create'}
              <p class="text-muted success-subtitle">User baru berhasil dibuat.</p>
            {:else if credentialContext === 'restore'}
              <p class="text-muted success-subtitle">User aktif kembali dengan password baru. Simpan & bagikan kredensial ini.</p>
            {:else}
              <p class="text-muted success-subtitle">Password direset. Simpan dan bagikan kredensial baru dengan aman.</p>
            {/if}
          </div>

          <div class="credential-list">
            <div class="credential-item">
              <span class="credential-label">Email</span>
              <div class="credential-row">
                <code>{generatedCredentials.email}</code>
                <button
                  class="copy-btn"
                  type="button"
                  on:click={() => generatedCredentials && copyValue('Email', generatedCredentials.email)}
                >
                  <Icon name="content_copy" size={18} />
                </button>
              </div>
            </div>
            <div class="credential-item">
              <span class="credential-label">Password</span>
              <div class="credential-row">
                <code>{generatedCredentials.password}</code>
                <button
                  class="copy-btn"
                  type="button"
                  on:click={() => generatedCredentials && copyValue('Password', generatedCredentials.password)}
                >
                  <Icon name="content_copy" size={18} />
                </button>
              </div>
            </div>
          </div>

          <div class="warning-box">
            <div class="warning-icon">
              <Icon name="warning" size={18} />
            </div>
            <p>
              <strong>Simpan password ini baik-baik.</strong> Password tidak akan ditampilkan lagi.
            </p>
          </div>

          {#if copyMessage}
            <p class="text-muted copy-feedback">{copyMessage}</p>
          {/if}

          <div class="modal-footer success-footer">
            <button class="btn-submit signature-bg done-btn" type="button" on:click={closeModal}>Selesai</button>
          </div>
        </div>
      {:else}
        <form class="modal-body modal-form" on:submit|preventDefault={handleCreateUser}>
          <div class="field">
            <label for="add-user-username">Username</label>
            <div class="input-shell">
              <InputText id="add-user-username" bind:value={username} placeholder="e.g. alex" required />
              <span class="input-icon">
                <Icon name="alternate_email" size={16} />
              </span>
            </div>
            <p class="hint text-muted">Email dan password akan dibuat otomatis secara aman sesuai domain yang ditentukan.</p>
          </div>

          {#if errorMessage}
            <p class="error">{errorMessage}</p>
          {/if}

          <div class="modal-footer">
            <button class="btn-cancel" type="button" disabled={isSubmitting} on:click={closeModal}>Batal</button>
            <button class="btn-submit signature-bg" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Membuat...' : 'Tambah User'}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<style>
  .header-actions {
    display: inline-flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .bulk-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0.6rem var(--space-4);
    border-bottom: 1px solid color-mix(in srgb, var(--color-outline), transparent 70%);
    flex-wrap: wrap;
  }

  .select-all {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .deleted-at {
    font-size: 0.75rem;
    white-space: nowrap;
  }


  .bulk-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: transparent;
    color: var(--color-text);
    border-radius: 9999px;
    padding: 0.3rem 0.8rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .bulk-btn.danger {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger), transparent 55%);
  }

  .bulk-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .row-select {
    display: inline-flex;
    align-items: center;
  }

  .row.selected {
    background: color-mix(in srgb, var(--color-primary-500), transparent 94%);
  }

  .latest-email {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    max-width: 34rem;
    min-height: 1.1rem;
    margin-top: 0.15rem;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--color-text-muted);
    overflow: hidden;
  }

  .latest-icon {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .latest-email.is-empty {
    font-style: italic;
    opacity: 0.75;
  }

  .latest-subject {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .latest-meta {
    white-space: nowrap;
  }

  .bulk-textarea {
    width: 100%;
    border: 0;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding: 0.9rem 0.9rem;
    font: inherit;
    font-size: 0.85rem;
    color: var(--color-text);
    resize: vertical;
    outline: none;
  }

  .bulk-textarea:focus {
    background: var(--color-surface-card);
  }

  .bulk-textarea::placeholder {
    color: var(--color-text-muted);
    opacity: 0.7;
    font-weight: 400;
  }

  .bulk-select {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding: 0.75rem 0.875rem;
    font: inherit;
    color: var(--color-text);
    outline: none;
  }

  .bulk-select:focus {
    border-color: color-mix(in srgb, var(--color-primary-500), var(--color-surface-card) 45%);
    background: var(--color-surface-card);
  }

  .bulk-errors {
    margin: var(--space-2) 0 0;
    padding-left: 1.1rem;
    color: var(--color-danger);
    font-size: 0.82rem;
  }

  .bulk-result {
    display: grid;
    gap: 0.35rem;
    max-height: 16rem;
    overflow: auto;
    margin: var(--space-3) 0;
  }

  .bulk-result-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 70%);
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
  }

  .bulk-result-row code {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: center;
    margin-bottom: var(--space-5);
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .list-feedback {
    margin: 0 0 var(--space-3);
    font-size: 0.84rem;
  }

  .list {
    display: grid;
    gap: 0.55rem;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    min-height: 5.25rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 70%);
    border-radius: var(--radius-md);
    padding: 0.75rem 0.85rem;
    background: color-mix(in srgb, var(--color-surface-low), var(--color-surface-card) 50%);
  }

  .row:hover {
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 65%);
    background: var(--color-surface-card);
  }

  .identity-link {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
    flex: 1;
    color: inherit;
    text-decoration: none;
  }

  .name {
    font-weight: 700;
  }

  .identity-metrics {
    margin-top: 0.22rem;
    display: inline-flex;
    gap: 0.8rem;
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .identity-text {
    min-width: 0;
    overflow: hidden;
    line-height: 1.35;
  }

  .identity-text > .text-muted {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    flex: 0 0 auto;
  }

  .meta-legacy {
    display: flex;
    align-items: center;
    gap: 0.7rem;
  }

  .quick-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .icon-action {
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: color-mix(in srgb, var(--color-surface-low), white 25%);
    color: var(--color-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-action:hover {
    color: var(--color-primary-500);
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 55%);
  }

  .icon-action.danger:hover {
    color: #bf273f;
    border-color: color-mix(in srgb, #bf273f, transparent 55%);
  }

  .icon-action:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .role {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--font-size-label-xs);
    color: var(--color-text-muted);
    font-weight: 700;
  }

  .empty {
    min-height: 15rem;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.6rem;
    text-align: center;
    color: var(--color-text-muted);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: color-mix(in srgb, var(--color-text), transparent 60%);
    backdrop-filter: blur(2px);
    z-index: 20;
  }

  .modal {
    position: fixed;
    inset: 0;
    z-index: 21;
    display: grid;
    place-items: center;
    padding: var(--space-5);
  }

  .modal-card {
    width: min(28rem, 100%);
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 75%);
    background: var(--color-surface-card);
    box-shadow: var(--shadow-modal);
    overflow: hidden;
  }

  .modal-success {
    width: min(32rem, 100%);
  }

  .top-accent {
    height: 0.38rem;
    width: 100%;
    background: var(--gradient-signature);
  }

  .modal-head {
    padding: var(--space-8) var(--space-8) var(--space-4);
  }

  h3 {
    font-size: 1.55rem;
    margin-bottom: 0.3rem;
    letter-spacing: -0.02em;
  }

  .modal-body {
    padding: var(--space-6) var(--space-8);
  }

  .modal-form {
    display: grid;
    gap: var(--space-4);
  }

  .credentials-pane {
    display: grid;
    gap: var(--space-4);
    padding-top: var(--space-8);
  }

  .success-head {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 0.45rem;
    margin-bottom: var(--space-2);
  }

  .success-icon-wrap {
    width: 4rem;
    height: 4rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--color-primary-500), white 85%);
    color: var(--color-primary-500);
    display: grid;
    place-items: center;
  }

  .success-title {
    font-size: 2rem;
    line-height: 1.1;
    margin: 0;
  }

  .success-subtitle {
    max-width: 22rem;
    margin: 0;
    font-size: 0.96rem;
  }

  .field {
    display: grid;
    gap: var(--space-2);
  }

  label {
    display: block;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: var(--font-size-label-xs);
    font-weight: 700;
  }

  .input-shell {
    position: relative;
  }

  .input-icon {
    position: absolute;
    right: var(--space-4);
    top: 50%;
    transform: translateY(-50%);
    color: color-mix(in srgb, var(--color-text-muted), transparent 40%);
    pointer-events: none;
  }

  .input-shell :global(.input) {
    border: 0;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding-top: 0.9rem;
    padding-bottom: 0.9rem;
    padding-right: 2.5rem;
  }

  .input-shell :global(.input):focus {
    background: var(--color-surface-card);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-3);
    padding: 0 var(--space-8) var(--space-8);
  }

  .btn-cancel {
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    font-family: var(--font-family-headline);
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 0.75rem;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: color-mix(in srgb, var(--color-surface-low), transparent 35%);
  }

  .btn-submit {
    border: 0;
    color: #fff;
    font-family: var(--font-family-headline);
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 0.75rem;
    padding: 0.75rem 2rem;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(0, 81, 255, 0.2);
  }

  .btn-submit:disabled,
  .btn-cancel:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .hint {
    margin-top: 0;
    font-size: 0.8rem;
  }

  .credential-list {
    display: grid;
    gap: var(--space-3);
  }

  .credential-item {
    display: grid;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 60%);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding: 0.7rem 0.85rem;
  }

  .credential-label {
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--font-size-label-xs);
    font-weight: 700;
  }

  .credential-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  code {
    font-size: 0.85rem;
    font-family: 'Consolas', 'Courier New', monospace;
    color: var(--color-primary-500);
    overflow-wrap: anywhere;
  }

  .copy-btn {
    border: 0;
    background: transparent;
    color: var(--color-primary-500);
    border-radius: 0.5rem;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .copy-btn:hover {
    background: color-mix(in srgb, var(--color-primary-500), white 88%);
  }

  .warning-box {
    margin-top: var(--space-2);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    background: color-mix(in srgb, var(--color-warning), white 88%);
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .warning-box p {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: color-mix(in srgb, var(--color-warning), #402000 30%);
  }

  .warning-icon {
    color: var(--color-warning);
    margin-top: 0.1rem;
  }

  .copy-feedback {
    font-size: 0.8rem;
    margin: 0;
  }

  .success-footer {
    padding-top: var(--space-2);
  }

  .done-btn {
    width: 100%;
    font-size: 1rem;
    padding-top: 0.85rem;
    padding-bottom: 0.85rem;
  }

  .error {
    color: #c1263c;
    font-size: 0.85rem;
  }

  @media (max-width: 960px) {
    .panel-header {
      flex-direction: column;
      align-items: stretch;
      margin-bottom: var(--space-4);
    }

    .row {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-3);
      padding: 0.75rem;
    }

    .identity-link {
      align-items: flex-start;
    }

    .identity-metrics {
      flex-wrap: wrap;
      gap: 0.45rem 0.8rem;
    }

    .meta {
      width: 100%;
      flex-wrap: wrap;
      justify-content: space-between;
      row-gap: var(--space-2);
    }

    .quick-actions {
      order: 3;
    }

    .modal {
      align-items: end;
      padding: 0;
    }

    .modal-card,
    .modal-success {
      width: 100%;
      border-radius: 1rem 1rem 0 0;
      max-height: 92vh;
      overflow: auto;
    }

    .modal-head,
    .modal-body,
    .modal-footer {
      padding-left: var(--space-4);
      padding-right: var(--space-4);
    }

    .modal-head {
      padding-top: var(--space-5);
    }

    .modal-body {
      padding-bottom: var(--space-4);
    }

    .modal-footer {
      padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
      flex-wrap: wrap;
      justify-content: stretch;
    }

    .modal-footer :global(.btn),
    .btn-submit,
    .btn-cancel {
      width: 100%;
    }

    .credential-row {
      align-items: flex-start;
    }
  }
</style>
