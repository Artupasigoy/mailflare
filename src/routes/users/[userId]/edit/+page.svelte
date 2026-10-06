<script lang="ts">
  import { goto } from '$app/navigation';
  import AppSidebar from '$lib/components/organisms/AppSidebar.svelte';
  import AppTopbar from '$lib/components/organisms/AppTopbar.svelte';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import InputText from '$lib/components/atoms/InputText.svelte';
  import Checkbox from '$lib/components/atoms/Checkbox.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import { toastStore } from '$lib/stores/toast.store';
  import { page } from '$app/stores';
  import { sidebarCollapsed } from '$lib/stores/ui.store';
  import type { PageData } from './$types';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let data: PageData;
  $: adminEmail = $page.data.sessionEmail ?? null;

  let email = data.user.email;
  let displayName = data.user.displayName;
  let telegramEnabled = data.user.telegramEnabled;
  let password = '';
  let confirmPassword = '';
  let isSubmitting = false;
  let isDeleting = false;
  let errorMessage = '';

  // User aktif -> "Pindahkan ke Sampah" (soft delete). User di Sampah -> "Hapus Permanen".
  $: isActiveUser = data.user.status === 'active';
  $: canDelete = data.user.role !== 'owner';

  async function handleSave() {
    if (isSubmitting || isDeleting) {
      return;
    }

    isSubmitting = true;
    errorMessage = '';

    if (password && password.length < 8) {
      errorMessage = 'Password minimal 8 karakter.';
      isSubmitting = false;
      return;
    }
    if (password && password !== confirmPassword) {
      errorMessage = 'Konfirmasi password tidak sama.';
      isSubmitting = false;
      return;
    }

    try {
      const response = await fetch(`/api/users/${data.user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          displayName,
          telegramEnabled,
          ...(password ? { password } : {})
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        errorMessage = payload?.error ?? 'Gagal memperbarui user.';
        return;
      }

      await goto('/users');
    } catch {
      errorMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDelete() {
    if (isDeleting || isSubmitting) {
      return;
    }

    const confirmed = isActiveUser
      ? await confirmDialog({
          title: 'Pindahkan ke Sampah',
          message: `${data.user.email} akan dipindahkan ke Sampah. User tidak bisa login, email tetap tersimpan, dan bisa dipulihkan selama 30 hari.`,
          confirmLabel: 'Pindahkan'
        })
      : await confirmDialog({
          title: 'Hapus Permanen',
          message: `User ${data.user.email} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
          confirmLabel: 'Hapus Permanen',
          danger: true
        });
    if (!confirmed) return;

    isDeleting = true;
    errorMessage = '';

    try {
      const response = await fetch(`/api/users/${data.user.id}`, {
        method: 'DELETE',
        headers: {
          'x-mailflare-confirm': isActiveUser ? 'soft-delete-user' : 'delete-user'
        }
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | {
              error?: string;
              dependencies?: { emails?: number; loginSessions?: number };
            }
          | null;

        if (payload?.dependencies) {
          errorMessage = `${payload.error ?? 'Gagal menghapus user.'} (email: ${payload.dependencies.emails ?? 0}, sesi: ${payload.dependencies.loginSessions ?? 0})`;
        } else {
          errorMessage = payload?.error ?? 'Gagal menghapus user.';
        }
        return;
      }

      toastStore.success(isActiveUser ? 'User dipindahkan ke Sampah' : 'User dihapus permanen');
      await goto('/users');
    } catch {
      errorMessage = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      isDeleting = false;
    }
  }
</script>

<div class="layout-shell">
  <AppSidebar active="users" adminEmail={adminEmail} />
  <section class="main" class:sidebar-collapsed={$sidebarCollapsed}>
    <AppTopbar title="Edit User"
      variant="minimal"
      showRefresh={false}
      showLogout={false} breadcrumb="mailflare / users / edit" showSearch={false} />
    <div class="content">
      <CardSurface>
        <div class="panel">
          <div>
            <h2>Edit User</h2>
            <p class="text-muted">Perbarui identitas dan alamat email user.</p>
          </div>

          <form class="form" on:submit|preventDefault={handleSave}>
            <div>
              <label for="display-name">Nama Tampilan</label>
              <InputText id="display-name" bind:value={displayName} required />
            </div>

            <div>
              <label for="email">Email</label>
              <InputText id="email" type="email" bind:value={email} required />
            </div>
            <div>
              <label for="password">Password Baru (Opsional)</label>
              <InputText id="password" type="password" bind:value={password} placeholder="Kosongkan jika tidak diubah" />
            </div>
            <div>
              <label for="confirm-password">Konfirmasi Password Baru</label>
              <InputText id="confirm-password" type="password" bind:value={confirmPassword} placeholder="Ulangi password baru" />
            </div>

            <div>
              <Checkbox id="telegram-enabled" bind:checked={telegramEnabled} />
              <label for="telegram-enabled" class="inline-label">Teruskan email masuk ke Telegram</label>
            </div>

            {#if errorMessage}
              <p class="error">{errorMessage}</p>
            {/if}

            <div class="actions">
              <Button href="/users" variant="ghost">Batal</Button>
              {#if canDelete}
                <Button type="button" variant="secondary" disabled={isDeleting || isSubmitting} on:click={handleDelete}>
                  {#if isDeleting}
                    {(isActiveUser ? 'Memindahkan' : 'Menghapus') + '...'}
                  {:else}
                    {isActiveUser ? 'Pindahkan ke Sampah' : 'Hapus Permanen'}
                  {/if}
                </Button>
              {/if}
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </CardSurface>
    </div>
  </section>
</div>

<style>
  .main {
    min-width: 0;
  }

  .content {
    padding: var(--space-5);
  }

  .panel {
    display: grid;
    gap: var(--space-5);
    max-width: 42rem;
  }

  h2 {
    font-size: 1.35rem;
    margin-bottom: 0.3rem;
  }

  .form {
    display: grid;
    gap: var(--space-4);
  }

  label {
    display: block;
    margin-bottom: 0.35rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: var(--font-size-label-xs);
    font-weight: 700;
  }

  .inline-label {
    display: inline;
    margin-left: 0.5rem;
    text-transform: none;
    letter-spacing: normal;
    font-size: 0.9rem;
    font-weight: 400;
    color: var(--color-text);
    cursor: pointer;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
  }

  .error {
    color: #c1263c;
    font-size: 0.85rem;
  }

  @media (max-width: 960px) {
    .content {
      padding: var(--space-4) var(--space-3);
    }

    .actions {
      flex-wrap: wrap;
      justify-content: stretch;
    }

    .actions :global(.btn) {
      flex: 1 1 100%;
    }
  }
</style>
