<script lang="ts">
  import { goto } from '$app/navigation';
  import { page as pageStore, navigating } from '$app/stores';
  import GmailShell from '$lib/components/organisms/GmailShell.svelte';
  import GmailEmail from '$lib/components/organisms/GmailEmail.svelte';
  import BackLink from '$lib/components/molecules/BackLink.svelte';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Badge from '$lib/components/atoms/Badge.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import EmailBodyViewer from '$lib/components/molecules/EmailBodyViewer.svelte';
  import type { PageData } from './$types';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let data: PageData;

  type EmailQuickAction = 'star' | 'delete';

  let email = data.email;
  let activeEmailId = data.email.id;
  let isStarred = data.email.isStarred;
  let actionPending = false;
  let actionMessage = '';
  let actionError = '';

  $: email = data.email;

  $: if (data.email.id !== activeEmailId) {
    activeEmailId = data.email.id;
    isStarred = data.email.isStarred;
    actionPending = false;
    actionMessage = '';
    actionError = '';
  }

  $: currentView = $pageStore.url.searchParams.get('view');
  $: backHref = currentView ? `/me/inbox?view=${currentView}` : '/me/inbox';
  $: backLabel = currentView === 'trash' ? 'Kembali ke Sampah' : currentView === 'starred' ? 'Kembali ke Berbintang' : 'Kembali ke Kotak Masuk';
  $: receivedLabel = email.receivedAt ? new Date(email.receivedAt).toLocaleString() : '-';

  async function runQuickAction(action: EmailQuickAction) {
    if (actionPending) {
      return;
    }

    if (action === 'delete' && !(await confirmDialog({ title: 'Pindahkan ke Sampah', message: 'Email ini akan dipindahkan ke Sampah.', confirmLabel: 'Pindahkan', danger: true }))) {
      return;
    }

    actionMessage = '';
    actionError = '';
    actionPending = true;

    try {
      const response = await fetch(`/api/me/emails/${encodeURIComponent(email.id)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        email?: { isStarred?: boolean };
      };

      if (!response.ok) {
        actionError = payload.error ?? 'Gagal memperbarui status email.';
        return;
      }

      if (action === 'star') {
        isStarred = typeof payload.email?.isStarred === 'boolean' ? payload.email.isStarred : !isStarred;
        actionMessage = isStarred ? 'Bintang ditambahkan.' : 'Bintang dihapus.';
        toastStore.success(isStarred ? 'Bintang ditambahkan' : 'Bintang dihapus');
        return;
      }

      toastStore.success('Email dipindahkan ke Sampah');
      await goto('/me/inbox');
    } catch {
      actionError = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      actionPending = false;
    }
  }
</script>

<GmailShell>
  {#if $navigating}
    <p class="loading-hint" role="status">Memuat...</p>
  {/if}
  <div class="back-row">
    <BackLink href={backHref} label={backLabel} />
  </div>
  <GmailEmail email={email} apiBase="/api/me/emails" backHref={backHref} view={currentView === 'trash' ? 'trash' : currentView === 'starred' ? 'starred' : 'inbox'} />
</GmailShell>

<style>
  .back-row {
    display: flex;
    justify-content: flex-start;
    padding: 0 1rem 0.5rem;
  }

  .loading-hint {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    color: var(--gm-blue, #1a73e8);
    font-weight: 600;
  }
</style>
