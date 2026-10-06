<script lang="ts">
  import { goto } from '$app/navigation';
  import AppSidebar from '$lib/components/organisms/AppSidebar.svelte';
  import AppTopbar from '$lib/components/organisms/AppTopbar.svelte';
  import MailboxTopbar from '$lib/components/organisms/MailboxTopbar.svelte';
  import GmailEmail from '$lib/components/organisms/GmailEmail.svelte';
  import GmailTabs from '$lib/components/organisms/GmailTabs.svelte';
  import BackLink from '$lib/components/molecules/BackLink.svelte';
  import Badge from '$lib/components/atoms/Badge.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import EmailBodyViewer from '$lib/components/molecules/EmailBodyViewer.svelte';
  import { page, navigating } from '$app/stores';
  import { sidebarCollapsed } from '$lib/stores/ui.store';
  import type { PageData } from './$types';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let data: PageData;
  $: adminEmail = $page.data.sessionEmail ?? null;

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

  $: receivedLabel = email.receivedAt ? new Date(email.receivedAt).toLocaleString() : '-';
  type MailboxView = 'inbox' | 'starred' | 'trash';
  $: rawView = $page.url.searchParams.get('view');
  $: view = (rawView === 'starred' ? 'starred' : rawView === 'trash' ? 'trash' : 'inbox') as MailboxView;
  $: fromAllEmails = $page.url.searchParams.get('from') === 'all';
  $: inboxHrefBase = data.inboxOnly ? '/me/inbox' : `/users/${data.userId}/inbox`;
  $: sourceHref = fromAllEmails ? '/users/emails' : inboxHrefBase;
  $: sourceLabel = fromAllEmails ? 'Kembali ke Semua Email' : view === 'trash' ? 'Kembali ke Sampah' : view === 'starred' ? 'Kembali ke Berbintang' : 'Kembali ke Kotak Masuk';
  $: inboxHref =
    data.inboxOnly || view === 'inbox'
      ? inboxHrefBase
      : `${inboxHrefBase}?view=${view}`;
  $: actionApiBase = data.inboxOnly ? '/api/me/emails' : `/api/users/${data.userId}/emails`;

  async function runQuickAction(action: EmailQuickAction) {
    if (actionPending) {
      return;
    }

    if (action === 'delete' && !(await confirmDialog({ title: 'Pindahkan ke Sampah', message: 'Email ini akan dipindahkan ke Sampah.', confirmLabel: 'Pindahkan', danger: true }))) {
      return;
    }

    actionPending = true;
    actionMessage = '';
    actionError = '';

    try {
      const response = await fetch(`${actionApiBase}/${encodeURIComponent(email.id)}`, {
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
      await goto(inboxHref);
    } catch {
      actionError = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      actionPending = false;
    }
  }
</script>

{#if data.inboxOnly}
  <section class="inbox-only-main">
    <MailboxTopbar
      userLabel={data.currentUser?.displayName ?? data.currentUser?.email ?? data.userId}
      showSearch={false}
      showRefresh={false}
    />
    <div class="content">
      {#if $navigating}
        <p class="loading-hint" role="status">Memuat...</p>
      {/if}
      <div class="back-row">
        <BackLink href={sourceHref} label={sourceLabel} />
      </div>
      <div class="tab-wrap">
        <GmailTabs view={view} basePath={`/users/${data.userId}/inbox`} />
      </div>
      <GmailEmail email={email} apiBase="/api/me/emails" backHref={sourceHref} view={view} />
    </div>
  </section>
{:else}
  <div class="layout-shell">
    <AppSidebar active="users" adminEmail={adminEmail} />
    <section class="main" class:sidebar-collapsed={$sidebarCollapsed}>
      <AppTopbar
        title="Email"
        variant="minimal"
        showRefresh={false}
        showLogout={false}
        mailboxEmail={data.currentUser?.email ?? data.userId}
      />
      <div class="content">
        {#if $navigating}
          <p class="loading-hint" role="status">Memuat...</p>
        {/if}
        <div class="back-row">
          <BackLink href={sourceHref} label={sourceLabel} />
        </div>
        <div class="tab-wrap">
          <GmailTabs view={view} basePath={`/users/${data.userId}/inbox`} />
        </div>
        <GmailEmail email={email} apiBase={actionApiBase} backHref={sourceHref} view={view} recipientLabel={`kepada ${email.recipient ?? data.currentUser?.email ?? ""}`} />
      </div>
    </section>
  </div>
{/if}

<style>
  .loading-hint {
    margin: 0 0 0.5rem;
    font-size: 0.82rem;
    color: var(--gm-blue, #1a73e8);
    font-weight: 600;
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

  .content {
    padding: var(--space-5);
  }

  @media (max-width: 960px) {
    .content {
      padding: var(--space-4) var(--space-3);
    }
  }
</style>
