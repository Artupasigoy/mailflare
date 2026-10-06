<script lang="ts">
  /**
   * Baris email reusable — dipakai oleh semua daftar email (GmailInbox member/admin
   * dan halaman "Semua Email"). Styling memakai token --gm-* agar konsisten.
   *
   * Slot:
   * - `leading` : kolom checkbox (opsional, dipakai daftar yang support bulk select)
   * - `star`    : tombol bintang
   * - `actions` : tombol aksi di kanan (tampil saat hover)
   */
  export let href = '';
  export let sender = '';
  export let subject = '';
  export let snippet = '';
  export let receivedAt = '';
  export let isRead = true;
  export let isStarred = false;
  export let recipient = '';
  export let showLeading = false;
  export let showRecipient = false;
  export let showStar = true;
  export let showTime = true;
  export let showActions = false;
  export let selected = false;
</script>

<div class={`mail-row ${isRead ? '' : 'unread'} ${selected ? 'selected' : ''} ${showLeading ? 'has-leading' : ''}`}>
  {#if showLeading}
    <span class="lead-cell" on:click|stopPropagation>
      <slot name="leading" />
    </span>
  {/if}
  {#if showStar}
    <span class="star-cell" on:click|stopPropagation>
      <slot name="star" />
    </span>
  {/if}
  <a class="row-link" {href}>
    <span class="sender">{sender}</span>
    <span class="subject">
      {subject}{#if snippet}<span class="snippet">– {snippet}</span>{/if}
    </span>
    {#if showRecipient}
      <span class="recipient" title={recipient}>{recipient}</span>
    {/if}
    {#if showTime}
      <span class="time">{receivedAt}</span>
    {/if}
  </a>
  {#if showActions}
    <span class="actions" on:click|stopPropagation>
      <slot name="actions" />
    </span>
  {/if}
</div>

<style>
  .mail-row {
    position: relative;
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) minmax(0, 2.4fr) 92px auto;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 1rem 0.45rem 0.6rem;
    border-bottom: 1px solid var(--gm-line);
    font-size: 0.875rem;
    color: var(--gm-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  .mail-row.has-leading {
    grid-template-columns: 26px 26px minmax(0, 1fr) minmax(0, 2.4fr) 92px auto;
  }

  .mail-row.has-recipient {
    grid-template-columns: 26px minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr) 92px auto;
  }

  .mail-row.has-leading.has-recipient {
    grid-template-columns: 26px 26px minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr) 92px auto;
  }

  .mail-row:hover {
    background: var(--gm-surface-2);
  }

  .mail-row.unread {
    font-weight: 700;
  }

  .mail-row.selected {
    background: var(--gm-selected);
  }

  .lead-cell,
  .star-cell {
    display: inline-flex;
    align-items: center;
  }

  .row-link {
    display: contents;
    color: inherit;
    text-decoration: none;
  }

  .sender,
  .subject,
  .recipient {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .snippet {
    color: var(--gm-muted);
    font-weight: 400;
  }

  .recipient {
    font-size: 0.78rem;
    color: var(--gm-muted);
    font-weight: 400;
  }

  .time {
    font-size: 0.78rem;
    color: var(--gm-muted);
    text-align: right;
    white-space: nowrap;
  }

  .mail-row.unread .time {
    color: var(--gm-text);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.15rem;
    padding-right: 0.15rem;
    opacity: 0;
    transition: opacity 120ms ease;
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    background: var(--gm-surface-2);
    border-radius: 999px;
    padding: 0 0.15rem;
  }

  .mail-row:hover .actions,
  .mail-row:focus-within .actions {
    opacity: 1;
  }

  .mail-row:hover .time,
  .mail-row:focus-within .time {
    opacity: 0;
  }

  .mail-row.selected:hover .actions,
  .mail-row.selected:focus-within .actions {
    background: var(--gm-selected);
  }

  @media (max-width: 720px) {
    .mail-row,
    .mail-row.has-leading,
    .mail-row.has-recipient,
    .mail-row.has-leading.has-recipient {
      grid-template-columns: 24px minmax(0, 1fr) auto;
      grid-template-areas:
        'lead sender time'
        'actions subject subject';
      gap: 0.2rem 0.5rem;
      align-items: start;
      padding: 0.65rem 0.85rem 0.65rem 0.5rem;
    }

    .lead-cell { grid-area: lead; }
    .star-cell { grid-area: actions; }
    .row-link {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-areas: 'sender' 'subject';
      gap: 0.15rem;
    }
    .sender { grid-area: sender; font-size: 0.9rem; }
    .subject {
      grid-area: subject;
      font-size: 0.83rem;
      font-weight: 400;
      color: var(--gm-muted);
    }
    .mail-row.unread .subject {
      font-weight: 700;
      color: var(--gm-text);
    }
    .recipient { display: none; }
    .time {
      grid-area: time;
      text-align: right;
      font-size: 0.72rem;
      padding-top: 2px;
    }
    .actions { display: none; }
  }
</style>