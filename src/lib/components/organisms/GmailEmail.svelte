<script lang="ts">
  import { goto } from '$app/navigation';
  import type { EmailDetailDto } from '$lib/types/dto';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import EmailBodyViewer from '$lib/components/molecules/EmailBodyViewer.svelte';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  export let email: EmailDetailDto;
  export let apiBase: string;
  export let backHref = '/me/inbox';
  /** Tombol kembali di toolbar; biarkan false karena BackLink dipakai di atas tab. */
  export let showBack = false;
  export let view: 'inbox' | 'starred' | 'trash' = 'inbox';
  export let recipientLabel = 'kepada saya';

  let isStarred = email.isStarred;
  let pending = false;
  let error = '';

  async function act(action: 'star' | 'delete' | 'untrash' | 'unread') {
    if (pending) return;
    if (action === 'delete' && !(await confirmDialog({ title: 'Pindahkan ke Sampah', message: 'Email ini akan dipindahkan ke Sampah.', confirmLabel: 'Pindahkan', danger: true }))) return;
    pending = true;
    error = '';
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(email.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        error = payload.error ?? 'Gagal menyimpan perubahan.';
        return;
      }
      if (action === 'star') {
        isStarred = !isStarred;
      } else {
        if (action === 'delete') {
          toastStore.success('Email dipindahkan ke Sampah');
        } else if (action === 'untrash') {
          toastStore.success('Email dipulihkan');
        } else if (action === 'unread') {
          toastStore.success('Email ditandai belum dibaca');
        }
        goto(backHref);
      }
    } catch {
      error = 'Tidak dapat menghubungi server.';
    } finally {
      pending = false;
    }
  }

  function dateLabel(): string {
    const date = new Date(email.receivedAt);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function senderName(): string {
    const match = email.sender.match(/^([^<]+)/);
    return String(match ? match[1] : email.sender).replace(/"/g, '').trim();
  }

  function senderAddress(): string {
    const match = email.sender.match(/<([^>]+)>/);
    return match ? `<${match[1]}>` : '';
  }
</script>

<div class="card">
  <div class="toolbar">
    <div class="tb-left">
      {#if showBack}
        <a class="tb-btn" href={backHref} title="Kembali" aria-label="Kembali ke inbox">
          <Icon name="arrow_back" size={18} />
        </a>
      {/if}
      {#if view === 'trash'}
        <button class="tb-btn" type="button" title="Pulihkan" aria-label="Pulihkan email" on:click={() => act('untrash')} disabled={pending}>
          <Icon name="restore" size={18} />
        </button>
      {:else}
        <button class="tb-btn danger" type="button" title="Pindahkan ke Sampah" aria-label="Pindahkan ke Sampah" on:click={() => act('delete')} disabled={pending}>
          <Icon name="delete" size={18} />
        </button>
      {/if}
      <button class="tb-btn" type="button" title="Tandai belum dibaca" aria-label="Tandai belum dibaca" on:click={() => act('unread')} disabled={pending}>
        <Icon name="mark_email_unread" size={18} />
      </button>
      <span class="divider" aria-hidden="true"></span>
      <button
        class={`tb-btn ${isStarred ? 'starred' : ''}`}
        type="button"
        title={isStarred ? 'Hapus bintang' : 'Beri bintang'}
        aria-label={isStarred ? 'Hapus bintang' : 'Beri bintang'}
        on:click={() => act('star')}
        disabled={pending}
      >
        <svg
          class="star-svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={isStarred ? 'currentColor' : 'none'}
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.35l-5.7 3-1.09-6.34-4.62-4.5 6.38-.93z" />
        </svg>
      </button>
    </div>
    {#if error}
      <span class="error">{error}</span>
    {/if}
  </div>

  <h1 class="subject">{email.subject}</h1>

  <div class="sender-row">
    <span class="avatar" aria-hidden="true"><Icon name="person" size={20} /></span>
    <div class="sender-info">
      <div class="sender-line">
        <strong>{senderName()}</strong>
        <span class="address">{senderAddress()}</span>
      </div>
      <div class="to">{recipientLabel}</div>
    </div>
    <div class="right-meta">
      <span class="date">{dateLabel()}</span>
    </div>
  </div>

  {#if email.attachmentCount && email.attachmentCount > 0}
    <p class="attachments">{email.attachmentCount} lampiran</p>
  {/if}

  <div class="body">
    <EmailBodyViewer bodyHtml={email.bodyHtml} bodyText={email.bodyText} snippet={email.snippet} />
  </div>
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

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--gm-line);
  }

  .tb-left {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tb-btn {
    background: transparent;
    border: 0;
    color: var(--gm-muted);
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    text-decoration: none;
  }

  .tb-btn:hover:not(:disabled) {
    background: var(--gm-line);
  }

  .tb-btn:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .tb-btn.starred {
    color: var(--gm-blue);
  }

  .tb-btn.danger {
    color: var(--gm-danger);
  }

  .star-svg {
    display: block;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--gm-border);
    margin: 0 0.35rem;
  }

  .error {
    color: var(--gm-danger);
    font-size: 0.8rem;
  }

  .subject {
    flex: 1;
    margin: 0;
    padding: 1rem 1.25rem 0.5rem;
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--gm-text);
    line-height: 1.3;
  }

  .sender-row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 1.25rem 0.75rem;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--gm-line);
    color: var(--gm-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sender-info {
    min-width: 0;
  }

  .sender-line {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .sender-line strong {
    font-size: 0.9rem;
  }

  .address {
    color: var(--gm-muted);
    font-size: 0.82rem;
  }

  .to {
    color: var(--gm-muted);
    font-size: 0.78rem;
  }

  .date {
    color: var(--gm-muted);
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .attachments {
    margin: 0 1.25rem 0.5rem;
    font-size: 0.8rem;
    color: var(--gm-muted);
  }

  .body {
    padding: 0 1.25rem 1.5rem;
  }
</style>