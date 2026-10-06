<script lang="ts">
  import { goto } from '$app/navigation';
  import GmailShell from '$lib/components/organisms/GmailShell.svelte';
  import GmailEmail from '$lib/components/organisms/GmailEmail.svelte';
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Badge from '$lib/components/atoms/Badge.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import EmailBodyViewer from '$lib/components/molecules/EmailBodyViewer.svelte';
  import type { PageData } from './$types';

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

  $: receivedLabel = email.receivedAt ? new Date(email.receivedAt).toLocaleString() : '-';

  async function runQuickAction(action: EmailQuickAction) {
    if (actionPending) {
      return;
    }

    if (action === 'delete' && !confirm('Soft delete email ini?')) {
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
        actionError = payload.error ?? 'Failed to update email status.';
        return;
      }

      if (action === 'star') {
        isStarred = typeof payload.email?.isStarred === 'boolean' ? payload.email.isStarred : !isStarred;
        actionMessage = isStarred ? 'Email starred.' : 'Star removed.';
        return;
      }

      await goto('/me/inbox');
    } catch {
      actionError = 'Unable to reach server. Please try again.';
    } finally {
      actionPending = false;
    }
  }
</script>

<GmailShell>
  <GmailEmail email={email} apiBase="/api/me/emails" backHref="/me/inbox" />
</GmailShell>

<style>
  .content {
    max-width: 80rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5);
  }

  .inbox-only-main {
    min-height: 100vh;
    width: 100%;
  }

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  h2 {
    margin-bottom: 0.2rem;
    line-height: 1.3;
  }

  .top-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-3);
  }

  .badges {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .icon-actions {
    display: inline-flex;
    align-items: center;
    background: var(--color-surface-low);
    padding: 0.25rem;
    border-radius: 0.6rem;
    gap: 0.2rem;
  }

  .icon-action {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.4rem;
    border: 0;
    background: transparent;
    color: var(--color-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 120ms ease;
  }

  .icon-action:disabled {
    opacity: 0.45;
    cursor: wait;
  }

  .icon-action:hover {
    background: var(--color-surface-card);
    color: var(--color-primary-500);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--color-text), transparent 95%);
  }

  .icon-action.danger:hover {
    color: var(--color-danger);
  }

  .action-feedback {
    margin: 0;
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  .action-feedback.error {
    color: var(--color-danger);
  }

  .meta-grid {
    margin-top: var(--space-4);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-3);
  }

  .meta-label {
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--font-size-label-xs);
    font-weight: 700;
  }

  .meta-value {
    margin-top: 0.2rem;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }

  .body {
    margin-top: var(--space-4);
  }

  .body-actions {
    margin-bottom: 0.75rem;
  }

  .download-btn {
    display: inline-block;
    border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 60%);
    background: transparent;
    color: var(--color-primary-500);
    border-radius: 0.5rem;
    padding: 0.3rem 0.7rem;
    font-size: 0.8rem;
    text-decoration: none;
  }

  .attachment-count {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: 0 0 0.5rem;
  }

  h3 {
    margin-bottom: var(--space-2);
  }

  @media (max-width: 960px) {
    .content {
      padding: var(--space-5) var(--space-3);
    }

    .head {
      flex-direction: column;
      align-items: flex-start;
    }

    .top-actions {
      align-items: flex-start;
      margin-top: var(--space-2);
    }

    .badges {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }

</style>
