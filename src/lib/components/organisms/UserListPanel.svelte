<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { LabelDto, UserDto } from '$lib/types/dto';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Badge from '$lib/components/atoms/Badge.svelte';
  import Avatar from '$lib/components/atoms/Avatar.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import InputText from '$lib/components/atoms/InputText.svelte';
  import InputTextarea from '$lib/components/atoms/InputTextarea.svelte';
  import Pager from '$lib/components/molecules/Pager.svelte';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let users: UserDto[] = [];
  export let total = 0;
  export let page = 1;
  export let pageSize = 20;
  export let trashView = false;
  export let labels: LabelDto[] = [];
  export let onPage: ((next: number) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{ usercreated: void; userchanged: void }>();

  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (bulkPending || isSubmitting || labelPending) return;
      modalOpen = false;
      bulkModalOpen = false;
      resetModalOpen = false;
      labelModalOpen = false;
      bulkLabelModalOpen = false;
      bulkLabelSelection = [];
      resetForm();
      bulkCredentials = [];
      bulkSkipped = [];
      bulkMode = 'create';
    }
  }


  let modalOpen = false;
  let username = '';
  let createPassword = '';
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
  let bulkMode: 'create' | 'restore' | 'resetPassword' = 'create';
  let selectAllEl: HTMLInputElement | undefined;
  // Bulk reset password
  let resetModalOpen = false;
  let resetPasswordMode: 'random' | 'same' = 'random';
  let resetSharedPassword = '';
  $: bulkResultTitle =
    bulkMode === 'restore' ? 'Pulihkan User Massal' : bulkMode === 'resetPassword' ? 'Reset Password Massal' : 'Buat User Massal';
  $: bulkResultSubtitle =
    bulkMode === 'restore'
      ? `${bulkCredentials.length} user berhasil dipulihkan${bulkSkipped.length > 0 ? `, ${bulkSkipped.length} dilewati` : ''}.`
      : bulkMode === 'resetPassword'
        ? `${bulkCredentials.length} password berhasil direset${bulkSkipped.length > 0 ? `, ${bulkSkipped.length} dilewati` : ''}.`
        : `${bulkCredentials.length} user berhasil dibuat${bulkSkipped.length > 0 ? `, ${bulkSkipped.length} dilewati` : ''}.`;
  // Edit label per user (modal label)
  let labelModalOpen = false;
  let labelTargetUser: UserDto | null = null;
  let labelSelection: string[] = [];
  let labelPending = false;
  // Bulk tambah label ke banyak user terpilih
  let bulkLabelModalOpen = false;
  let bulkLabelSelection: string[] = [];
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

  function visibleLabelsFor(user: UserDto) {
    return (user.labels ?? []).filter((label) => label.visible !== false);
  }

  function formatBytes(value: number | undefined): string {
    const bytes = Number(value ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function toggleSelect(id: string) {
    selectedIds = selectedSet.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id];
  }

  function toggleSelectAll() {
    selectedIds = allSelected ? [] : [...selectableIds];
  }

  function openLabelModal(user: UserDto) {
    labelTargetUser = user;
    labelSelection = (user.labels ?? []).map((label) => label.id);
    labelModalOpen = true;
  }

  function toggleLabelSelection(labelId: string) {
    labelSelection = labelSelection.includes(labelId)
      ? labelSelection.filter((id) => id !== labelId)
      : [...labelSelection, labelId];
  }

  async function saveUserLabels() {
    if (!labelTargetUser || labelPending) return;
    labelPending = true;
    listMessage = '';
    try {
      const response = await fetch(`/api/users/${labelTargetUser.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ labelIds: labelSelection })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menyimpan label.';
        return;
      }
      toastStore.success('Label user diperbarui');
      labelModalOpen = false;
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      labelPending = false;
    }
  }

  function openResetModal() {
    if (bulkPending || selectedActive === 0) return;
    resetPasswordMode = 'random';
    resetSharedPassword = '';
    resetModalOpen = true;
  }

  function openBulkLabelModal() {
    if (bulkPending || selectedIds.length === 0 || labels.length === 0) return;
    bulkLabelSelection = [];
    bulkLabelModalOpen = true;
  }

  function toggleBulkLabelSelection(labelId: string) {
    bulkLabelSelection = bulkLabelSelection.includes(labelId)
      ? bulkLabelSelection.filter((id) => id !== labelId)
      : [...bulkLabelSelection, labelId];
  }

  async function handleBulkAddLabels() {
    if (bulkPending || selectedIds.length === 0 || bulkLabelSelection.length === 0) return;
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'addLabels', userIds: selectedIds, labelIds: bulkLabelSelection })
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; added?: number; users?: number }
        | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal menambahkan label.';
        return;
      }
      listMessage = `Label ditambahkan ke ${payload?.users ?? 0} user (${payload?.added ?? 0} label).`;
      toastStore.success('Label ditambahkan');
      bulkLabelModalOpen = false;
      bulkLabelSelection = [];
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleBulkResetPassword() {
    if (bulkPending || selectedIds.length === 0) return;
    if (resetPasswordMode === 'same' && resetSharedPassword.trim().length < 8) {
      listMessage = 'Password bersama minimal 8 karakter.';
      return;
    }
    bulkPending = true;
    listMessage = '';
    try {
      const response = await fetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'resetPassword',
          userIds: selectedIds,
          ...(resetPasswordMode === 'same' && resetSharedPassword.trim() ? { password: resetSharedPassword.trim() } : {})
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            reset?: Array<{ email: string; password: string }>;
            skipped?: Array<{ email: string; reason: string }>;
          }
        | null;
      if (!response.ok) {
        listMessage = payload?.error ?? 'Gagal reset password.';
        return;
      }
      const reset = payload?.reset ?? [];
      if (reset.length > 0) {
        bulkCredentials = reset.map((item) => ({
          username: item.email.split('@')[0] ?? item.email,
          email: item.email,
          password: item.password
        }));
        bulkMode = 'resetPassword';
        bulkSharedPassword = '';
        resetModalOpen = false;
        bulkModalOpen = true;
      }
      const skipped = payload?.skipped ?? [];
      listMessage = `${reset.length} password direset${skipped.length ? `, ${skipped.length} dilewati` : ''}.`;
      toastStore.success(`${reset.length} password direset`);
      selectedIds = [];
      dispatch('userchanged');
    } catch {
      listMessage = 'Gagal menghubungi server.';
    } finally {
      bulkPending = false;
    }
  }

  async function handleBulkSoftDelete() {
    if (bulkPending || selectedIds.length === 0 || selectedActive === 0) return;
    if (
      !(await confirmDialog({
        title: 'Pindahkan ke Sampah',
        message: `${selectedActive} user akan dipindahkan ke Sampah. User tidak bisa login, email tetap tersimpan, dan bisa dipulihkan selama 30 hari.`,
        confirmLabel: 'Pindahkan'
      }))
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

  

  async function handleRestore(user: UserDto) {
    if (bulkPending || user.role === 'owner') return;
    if (!(await confirmDialog({ title: 'Pulihkan User', message: `${user.email} akan dipulihkan. Password baru akan dibuat.`, confirmLabel: 'Pulihkan', }))) return;
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
    if (!(await confirmDialog({ title: 'Pulihkan User', message: `${selectedIds.length} user akan dipulihkan. Password baru akan dibuat untuk masing-masing.`, confirmLabel: 'Pulihkan', }))) return;
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
        bulkMode = 'restore';
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
    bulkCredentials = [];
    bulkSkipped = [];
  }

  function closeBulkResult() {
    bulkCredentials = [];
    bulkSkipped = [];
    bulkModalOpen = false;
    bulkMode = 'create';
  }

  async function handleBulkCreate() {
    if (bulkPending) return;
    bulkErrors = [];
    if (bulkPasswordMode === 'same' && bulkSharedPassword.trim().length < 8) {
      bulkErrors = ['Password bersama minimal 8 karakter.'];
      return;
    }
    bulkPending = true;
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
    createPassword = '';
    errorMessage = '';
    copyMessage = '';
    generatedCredentials = null;
    credentialContext = 'create';
  }

  function generatePassword() {
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const numbers = '23456789';
    const symbols = '!@#$%^&*_-+=?';
    const all = `${lowercase}${uppercase}${numbers}${symbols}`;
    const randomInt = (max: number) => {
      const bytes = new Uint32Array(1);
      crypto.getRandomValues(bytes);
      return bytes[0] % max;
    };
    const pick = (chars: string) => chars[randomInt(chars.length)];
    const chars = [pick(lowercase), pick(uppercase), pick(numbers), pick(symbols)];
    while (chars.length < 18) {
      chars.push(pick(all));
    }
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    createPassword = chars.join('');
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
    const manualPassword = createPassword.trim();
    if (manualPassword && (manualPassword.length < 8 || manualPassword.length > 128)) {
      errorMessage = 'Password harus 8-128 karakter.';
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
          username: normalized,
          ...(manualPassword ? { password: manualPassword } : {})
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
      createPassword = '';
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
      copyMessage = `${label} disalin.`;
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
    if (!(await confirmDialog({ title: 'Reset Password', message: `Password baru akan dibuat untuk ${user.email}.`, confirmLabel: 'Reset' }))) return;

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
    if (!(await confirmDialog({ title: 'Hapus Permanen', message: `${user.email} beserta emailnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Hapus Permanen', danger: true, }))) return;
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
    if (!(await confirmDialog({ title: 'Kosongkan Sampah', message: `Semua user di Sampah akan dihapus permanen beserta emailnya. Tindakan ini tidak bisa dibatalkan.`, confirmLabel: 'Kosongkan', danger: true, }))) return;
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
    if (!(await confirmDialog({ title: 'Pindahkan ke Sampah', message: `${user.email} akan dipindahkan ke Sampah. User tidak bisa login, email tetap tersimpan, bisa dipulihkan selama 30 hari.`, confirmLabel: 'Pindahkan' }))) return;

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
      {#if trashView}
        <span class="text-muted">{users.length} user di Sampah</span>
        <button
          class="bulk-btn danger"
          type="button"
          disabled={bulkPending}
          on:click={handleEmptyTrash}
        >
          <Icon name="delete_forever" size={16} />
          Kosongkan Sampah
        </button>
      {:else}
        <label class="select-all">
          <input bind:this={selectAllEl} type="checkbox" checked={allSelected} on:change={toggleSelectAll} />
          <span>Pilih semua</span>
        </label>
        <span class="text-muted">
          {selectedIds.length > 0
            ? `${selectedIds.length} dipilih${selectedOnPage < selectedIds.length ? ` (${selectedOnPage} di halaman ini)` : ''}`
            : `${selectableUsers.length} user dapat dipilih`}
        </span>
        {#if selectedActive > 0}
          <button class="bulk-btn" type="button" disabled={bulkPending} on:click={openResetModal}>
            <Icon name="lock_reset" size={16} />
            Reset Password ({selectedActive})
          </button>
          <button class="bulk-btn danger" type="button" disabled={bulkPending} on:click={handleBulkSoftDelete}>
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
        {#if selectedIds.length > 0 && labels.length > 0}
          <button class="bulk-btn" type="button" disabled={bulkPending} on:click={openBulkLabelModal}>
            <Icon name="sell" size={16} />
            Tambah Label ({selectedIds.length})
          </button>
        {/if}
      {/if}
    </div>

    <div class="list">
      {#each users as user (user.id)}
        <div class={`row ${!trashView && selectedSet.has(user.id) ? 'selected' : ''}`}>
          {#if !trashView}
            <span class="row-select">
              <input
                type="checkbox"
                checked={selectedSet.has(user.id)}
                disabled={user.role === 'owner'}
                aria-label={`Pilih ${user.email}`}
                on:change={() => toggleSelect(user.id)}
              />
            </span>
          {/if}
          <a href={`/users/${user.id}/inbox`} class="identity-link" title="Buka inbox user ini">
            <Avatar initials={user.displayName.slice(0, 2).toUpperCase()} />
            <div class="identity-text">
              <div class="name">{user.displayName}</div>
              <div class="text-muted">{user.email}</div>
              <div class="text-muted identity-metrics">
                <span>Email: {formatCount(user.totalEmails)}</span>
                <span>Unread: {formatCount(user.unreadEmails)}</span>
                <span class="storage-metric" title="Total ukuran email tersimpan">
                  <Icon name="database" size={12} />
                  {formatBytes(user.storageBytes)}
                </span>
              </div>
              {#if visibleLabelsFor(user).length > 0}
                <div class="row-labels">
                  {#each visibleLabelsFor(user) as label (label.id)}
                    <span class={`row-label tone-${label.color}`}>
                      <span class="rdot"></span>
                      {label.name}
                    </span>
                  {/each}
                </div>
              {/if}
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
                aria-label="Atur label"
                title="Atur label"
                disabled={actionUserId === user.id || labelPending}
                on:click={() => openLabelModal(user)}
              >
                <Icon name="sell" size={16} />
              </button>
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
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={bulkPending} on:click={closeBulkModal}>
        <Icon name="close" size={18} />
      </button>
      <div class="modal-head">
        {#if bulkCredentials.length > 0}
          <h3 id="bulk-create-title">{bulkResultTitle}</h3>
          <p class="text-muted">{bulkResultSubtitle}</p>
        {:else}
          <h3 id="bulk-create-title">Buat User Massal</h3>
          <p class="text-muted">Satu username per baris (atau dipisah spasi/koma). Maks 100 user.</p>
        {/if}
      </div>

      {#if bulkCredentials.length === 0}
        <form class="modal-body modal-form" on:submit|preventDefault={handleBulkCreate}>
        <div class="field">
          <label for="bulk-usernames">Daftar username</label>
          <div class="input-shell">
            <InputTextarea
              id="bulk-usernames"
              rows={8}
              bind:value={bulkUsernames}
              placeholder={'andi\nbudi\nsiti'}
            />
          </div>
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
          <button class="btn-submit signature-bg" type="submit" disabled={bulkPending || bulkUsernames.trim().length === 0 || (bulkPasswordMode === 'same' && bulkSharedPassword.trim().length < 8)}>
            {bulkPending ? 'Membuat...' : 'Buat User'}
          </button>
        </div>
        </form>
      {:else}
        <div class="modal-body">
        <p class="text-muted">{bulkResultSubtitle}</p>

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
            on:click={closeBulkResult}
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
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={isSubmitting} on:click={closeModal}>
        <Icon name="close" size={18} />
      </button>
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
            <p class="hint text-muted">Email dibuat otomatis sesuai domain yang ditentukan.</p>
          </div>

          <div class="field">
            <label for="add-user-password">Password</label>
            <div class="password-shell">
              <InputText
                id="add-user-password"
                bind:value={createPassword}
                placeholder="Kosongkan untuk password acak"
                type="text"
              />
              <button
                class="generate-btn"
                type="button"
                aria-label="Buat password acak"
                title="Buat password acak"
                on:click={generatePassword}
              >
                <Icon name="casino" size={16} />
                Generate
              </button>
            </div>
            <p class="hint text-muted">Bisa ditulis manual, atau klik Generate untuk password acak.</p>
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

{#if resetModalOpen}
  <button class="modal-backdrop" type="button" aria-label="Tutup" on:click={() => !bulkPending && (resetModalOpen = false)}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
    <div class="modal-card">
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={bulkPending} on:click={() => (resetModalOpen = false)}>
        <Icon name="close" size={18} />
      </button>
      <div class="modal-head">
        <h3 id="reset-password-title">Reset Password Massal</h3>
        <p class="text-muted">{selectedActive} user aktif akan direset passwordnya. Sesi login lama otomatis dicabut.</p>
      </div>
      <div class="modal-body">
        <div class="resume-list">
          {#each users.filter((u) => selectedSet.has(u.id) && u.status === 'active') as user (user.id)}
            <div class="resume-row">
              <Avatar initials={user.displayName.slice(0, 2).toUpperCase()} />
              <div class="resume-info">
                <span class="resume-name">{user.displayName}</span>
                <span class="text-muted resume-email">{user.email}</span>
              </div>
            </div>
          {/each}
        </div>

        <div class="field">
          <label for="reset-password-mode">Password</label>
          <select id="reset-password-mode" class="bulk-select" bind:value={resetPasswordMode}>
            <option value="random">Acak (berbeda untuk tiap user)</option>
            <option value="same">Sama untuk semua user</option>
          </select>
        </div>

        {#if resetPasswordMode === 'same'}
          <div class="field">
            <label for="reset-shared-password">Password bersama</label>
            <InputText id="reset-shared-password" bind:value={resetSharedPassword} placeholder="Minimal 8 karakter" type="text" />
          </div>
        {/if}

        {#if listMessage}
          <p class="text-muted">{listMessage}</p>
        {/if}

        <div class="modal-footer">
          <button class="btn-cancel" type="button" disabled={bulkPending} on:click={() => (resetModalOpen = false)}>Batal</button>
          <button
            class="btn-submit signature-bg"
            type="button"
            disabled={bulkPending || (resetPasswordMode === 'same' && resetSharedPassword.trim().length < 8)}
            on:click={handleBulkResetPassword}
          >
            {bulkPending ? 'Memproses...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if labelModalOpen && labelTargetUser}
  <button class="modal-backdrop" type="button" aria-label="Tutup" on:click={() => !labelPending && (labelModalOpen = false)}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="user-label-title">
    <div class="modal-card">
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={labelPending} on:click={() => (labelModalOpen = false)}>
        <Icon name="close" size={18} />
      </button>
      <div class="modal-head">
        <h3 id="user-label-title">Label untuk {labelTargetUser.displayName}</h3>
        <p class="text-muted">Pilih satu atau lebih label untuk akun ini.</p>
      </div>
      <div class="modal-body">
        {#if labels.length === 0}
          <div class="empty">
            <Icon name="sell" size={32} />
            <p>Belum ada label. Buat label lewat tombol "Kelola" di halaman User List.</p>
          </div>
        {:else}
          <div class="label-pick">
            {#each labels as label (label.id)}
              <label class="label-pick-item">
                <input
                  type="checkbox"
                  class="cb-lg"
                  checked={labelSelection.includes(label.id)}
                  on:change={() => toggleLabelSelection(label.id)}
                />
                <span class={`row-label tone-${label.color} ${label.visible === false ? 'is-hidden-label' : ''}`}>
                  <span class="rdot"></span>
                  {label.name}{label.visible === false ? ' (disembunyikan)' : ''}
                </span>
              </label>
            {/each}
          </div>
        {/if}
        <div class="modal-footer">
          <button class="btn-cancel" type="button" disabled={labelPending} on:click={() => (labelModalOpen = false)}>Batal</button>
          <button class="btn-submit signature-bg" type="button" disabled={labelPending} on:click={saveUserLabels}>
            {labelPending ? 'Menyimpan...' : 'Simpan Label'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if bulkLabelModalOpen}
  <button class="modal-backdrop" type="button" aria-label="Tutup" on:click={() => !bulkPending && (bulkLabelModalOpen = false)}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="bulk-label-title">
    <div class="modal-card">
      <button class="modal-close" type="button" aria-label="Tutup" title="Tutup" disabled={bulkPending} on:click={() => (bulkLabelModalOpen = false)}>
        <Icon name="close" size={18} />
      </button>
      <div class="modal-head">
        <h3 id="bulk-label-title">Tambah Label Massal</h3>
        <p class="text-muted">{selectedIds.length} user terpilih. Label yang dipilih akan ditambahkan (label lama tetap tersimpan).</p>
      </div>
      <div class="modal-body">
        <div class="label-pick">
          {#each labels as label (label.id)}
            <label class="label-pick-item">
              <input
                type="checkbox"
                class="cb-lg"
                checked={bulkLabelSelection.includes(label.id)}
                on:change={() => toggleBulkLabelSelection(label.id)}
              />
              <span class={`row-label tone-${label.color} ${label.visible === false ? 'is-hidden-label' : ''}`}>
                <span class="rdot"></span>
                {label.name}{label.visible === false ? ' (disembunyikan)' : ''}
              </span>
            </label>
          {/each}
        </div>

        {#if listMessage}
          <p class="text-muted">{listMessage}</p>
        {/if}

        <div class="modal-footer">
          <button class="btn-cancel" type="button" disabled={bulkPending} on:click={() => (bulkLabelModalOpen = false)}>Batal</button>
          <button
            class="btn-submit signature-bg"
            type="button"
            disabled={bulkPending || bulkLabelSelection.length === 0}
            on:click={handleBulkAddLabels}
          >
            {bulkPending ? 'Menyimpan...' : `Tambah Label (${bulkLabelSelection.length})`}
          </button>
        </div>
      </div>
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

  .select-all input {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--color-primary-500);
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

  .row-select input {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--color-primary-500);
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

  .bulk-select {
    width: 100%;
    border: 0;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding: 0.9rem 0.9rem;
    font: inherit;
    color: var(--color-text);
    outline: none;
  }

  .bulk-select:focus {
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
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 45%);
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
    align-items: center;
    gap: 0.8rem;
    font-size: 0.78rem;
    white-space: nowrap;
    flex-wrap: wrap;
  }

  .storage-metric {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .row-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.28rem;
  }

  .row-label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    border-radius: 9999px;
    padding: 0.12rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 60%);
    background: color-mix(in srgb, var(--color-surface-low), transparent 30%);
    color: var(--color-text);
  }

  .row-label .rdot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-primary-500);
  }

  .row-label.tone-success .rdot { background: var(--color-success); }
  .row-label.tone-warning .rdot { background: var(--color-warning); }
  .row-label.tone-danger .rdot { background: var(--color-danger); }
  .row-label.tone-neutral .rdot { background: var(--color-text-muted); }
  .row-label.is-hidden-label { opacity: 0.55; font-style: italic; }

  .resume-list {
    display: grid;
    gap: 0.4rem;
    max-height: 14rem;
    overflow: auto;
    margin-bottom: var(--space-4);
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 75%);
    border-radius: var(--radius-md);
    padding: var(--space-2);
  }

  .resume-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .resume-info {
    display: grid;
    min-width: 0;
  }

  .resume-name {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .resume-email {
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .label-pick {
    display: grid;
    gap: 0.4rem;
    margin-bottom: var(--space-4);
  }

  .label-pick-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    cursor: pointer;
    padding: 0.4rem 0.5rem;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 80%);
  }

  .label-pick-item:hover {
    border-color: color-mix(in srgb, var(--color-primary-500), transparent 55%);
  }

  .cb-lg {
    width: 1.15rem;
    height: 1.15rem;
    accent-color: var(--color-primary-500);
    flex: 0 0 auto;
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

  .icon-action.danger {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger), transparent 60%);
    background: color-mix(in srgb, var(--color-danger), transparent 92%);
  }

  .icon-action.danger:hover {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger), transparent 35%);
    background: color-mix(in srgb, var(--color-danger), transparent 85%);
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
    position: relative;
    width: min(28rem, 100%);
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 75%);
    background: var(--color-surface-card);
    box-shadow: var(--shadow-modal);
    overflow: hidden;
  }

  .modal-close {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background-color 120ms ease, color 120ms ease;
  }

  .modal-close:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-text), transparent 92%);
    color: var(--color-text);
  }

  .modal-close:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .password-shell {
    position: relative;
  }

  .password-shell :global(.input) {
    border: 0;
    border-radius: 0.75rem;
    background: color-mix(in srgb, var(--color-surface-low), white 35%);
    padding-top: 0.9rem;
    padding-bottom: 0.9rem;
    padding-right: 7rem;
  }

  .password-shell :global(.input):focus {
    background: var(--color-surface-card);
  }

  .generate-btn {
    position: absolute;
    right: 0.4rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 45%);
    background: color-mix(in srgb, var(--color-primary-500), transparent 92%);
    color: var(--color-primary-500);
    border-radius: 0.6rem;
    padding: 0.4rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .generate-btn:hover {
    background: color-mix(in srgb, var(--color-primary-500), transparent 86%);
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
