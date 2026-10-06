<script lang="ts">
  import { onMount } from 'svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import { confirmDialog } from '$lib/stores/confirm.store';

  let query = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('q') ?? '';
  let menuOpen = false;
  let sidebarOpen = true;
  let isMobile = false;
  let loggingOut = false;

  onMount(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const sync = () => {
      isMobile = media.matches;
      sidebarOpen = !media.matches;
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  });

  $: active = activeView($page.url.pathname, $page.url.search);

  function activeView(path: string, search: string): 'inbox' | 'starred' | 'trash' | 'other' {
    const view = new URLSearchParams(search).get('view');
    // Halaman detail email tetap menyorot menu asal (Kotak Masuk / Berbintang / Sampah).
    if (path.startsWith('/me/inbox') || path.startsWith('/me/emails')) {
      if (view === 'starred') return 'starred';
      if (view === 'trash') return 'trash';
      return 'inbox';
    }
    return 'other';
  }

  function submit() {
    const trimmed = query.trim();
    goto(trimmed ? `/me/inbox?q=${encodeURIComponent(trimmed.slice(0, 200))}` : '/me/inbox');
  }

  function initials(): string {
    const email = String($page.data.sessionEmail ?? '');
    const part = email.split('@')[0] ?? 'U';
    return part.slice(0, 1).toUpperCase();
  }

  function closeDrawerOnMobile() {
    if (isMobile) {
      sidebarOpen = false;
    }
  }
</script>

<div class="shell" class:side-collapsed={!sidebarOpen}>
  {#if menuOpen}
    <button class="menu-scrim" type="button" aria-label="Tutup menu akun" on:click={() => (menuOpen = false)}></button>
  {/if}
  <header class="topbar">
    <button class="icon-btn" type="button" aria-label="Buka/tutup menu" title="Menu" on:click={() => (sidebarOpen = !sidebarOpen)}>
      <Icon name="menu" size={20} />
    </button>

    <a class="logo" href="/me/inbox" aria-label="Mailflare">
      <span class="logo-mark">M</span>
      <span class="logo-text">Mailflare</span>
    </a>

    <div class="search-wrap">
      <form class="search" on:submit|preventDefault={submit} role="search">
        <Icon name="search" size={18} />
        <input type="text" bind:value={query} placeholder="Telusuri email" aria-label="Telusuri email" />
      </form>
    </div>

    <div class="top-actions">
      <div class="profile">
        <button
          class="avatar"
          type="button"
          aria-label="Akun"
          on:click={() => (menuOpen = !menuOpen)}
        >{initials()}</button>
        {#if menuOpen}
          <div class="menu">
            <div class="menu-head">
              <strong>{$page.data.sessionEmail ?? '-'}</strong>
              <span>Akun ini</span>
            </div>
            <button
              class="menu-item"
              type="button"
              disabled={loggingOut}
              on:click={async () => {
                if (!(await confirmDialog({ title: 'Keluar', message: 'Anda yakin ingin keluar dari akun ini?', confirmLabel: 'Keluar', danger: true }))) return;
                loggingOut = true;
                try {
                  await fetch('/api/auth/logout');
                  await invalidateAll();
                  await goto('/auth/login');
                } finally {
                  loggingOut = false;
                }
              }}
            >{loggingOut ? 'Memproses...' : 'Keluar'}</button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <div class="layout">
    {#if sidebarOpen && isMobile}
      <button class="scrim" type="button" aria-label="Tutup menu" on:click={() => (sidebarOpen = false)}></button>
    {/if}
    <aside class="nav" class:collapsed={!sidebarOpen} class:open={sidebarOpen}>
<a class={active === 'inbox' ? 'on' : ''} href="/me/inbox" title="Kotak Masuk" on:click={closeDrawerOnMobile}>
      <Icon name="inbox" size={20} />
      <span class="nav-label">Kotak Masuk</span>
    </a>
    <a class={active === 'starred' ? 'on' : ''} href="/me/inbox?view=starred" title="Berbintang" on:click={closeDrawerOnMobile}>
      <Icon name="star" size={20} />
      <span class="nav-label">Berbintang</span>
    </a>
    <a class={active === 'trash' ? 'on' : ''} href="/me/inbox?view=trash" title="Sampah" on:click={closeDrawerOnMobile}>
      <Icon name="delete" size={20} />
      <span class="nav-label">Sampah</span>
    </a>
    </aside>

    <main class="content">
      <slot />
    </main>
  </div>
</div>

<style>
  .shell {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--gm-bg);
    color: var(--gm-text);
    font-family: Arial, Helvetica, sans-serif;
  }

  .menu-scrim {
    position: fixed;
    inset: 0;
    border: 0;
    background: transparent;
    z-index: 19;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 64px;
    padding: 0 0.75rem;
    background: var(--gm-bg);
  }

  .icon-btn {
    background: transparent;
    border: 0;
    color: var(--gm-muted);
    cursor: pointer;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: var(--gm-line);
  }

  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    text-decoration: none;
    margin-right: 0.25rem;
  }

  .logo-mark {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--gm-blue);
  }

  .logo-text {
    font-size: 1.35rem;
    color: var(--gm-text);
    white-space: nowrap;
  }

  .search {
    flex: 1;
    max-width: 900px;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    height: 48px;
    padding: 0 1rem;
    border-radius: 24px;
    background: var(--gm-surface-3);
    color: var(--gm-muted);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    outline: none;
    font-size: 1rem;
    color: var(--gm-text);
  }

  .search:focus-within {
    background: var(--gm-bg);
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
  }

  .search-wrap {
    position: absolute;
    left: 272px;
    right: 16px;
    top: 0;
    height: 64px;
    display: flex;
    align-items: center;
    z-index: 1;
  }

  .shell.side-collapsed .search-wrap {
    left: 80px;
  }

  .top-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    position: relative;
    z-index: 2;
  }

  .profile {
    position: relative;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0;
    background: linear-gradient(135deg, #4285f4, #ea4335);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }

  .menu {
    position: absolute;
    right: 0;
    top: 2.6rem;
    width: 260px;
    background: var(--gm-bg);
    border: 1px solid var(--gm-border);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(60, 64, 67, 0.2);
    padding: 0.75rem 0;
    z-index: 30;
  }

  .menu-head {
    padding: 0 1rem 0.6rem;
    border-bottom: 1px solid var(--gm-line);
  }

  .menu-head strong {
    display: block;
    font-size: 0.9rem;
  }

  .menu-head span {
    font-size: 0.75rem;
    color: var(--gm-muted);
  }

  .menu-item {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 0.6rem 1rem;
    color: var(--gm-text);
    text-decoration: none;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .menu-item:hover {
    background: var(--gm-line);
  }

  .layout {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 0 16px 16px;
    gap: 0;
  }

  .nav {
    width: 256px;
    flex: 0 0 256px;
    height: 100%;
    overflow-y: auto;
    padding: 0.25rem 0.85rem 0.25rem 0;
    transition: width 0.15s ease, flex-basis 0.15s ease;
  }

  .nav.collapsed {
    width: 64px;
    flex-basis: 64px;
  }

  .nav a {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 32px;
    margin: 0 0 2px;
    padding: 0 1rem;
    border-radius: 0 16px 16px 0;
    color: var(--gm-text);
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
  }

  .nav a:hover {
    background: var(--gm-line);
  }

  .nav a.on {
    background: var(--gm-blue-soft);
    color: var(--gm-blue-strong);
    font-weight: 700;
  }

  .nav.collapsed a {
    justify-content: center;
    padding: 0;
    width: 48px;
    border-radius: 16px;
    margin-left: 8px;
  }

  .nav.collapsed .nav-label {
    display: none;
  }

  .content {
    flex: 1;
    min-width: 0;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  @media (max-width: 960px) {
    .topbar {
      height: 56px;
      gap: 0.25rem;
      padding: 0 0.5rem;
    }

    .logo-text {
      display: none;
    }

    .search-wrap {
      position: static;
      height: auto;
      flex: 1;
    }

    .search {
      height: 42px;
    }

    .shell.side-collapsed .search-wrap {
      left: auto;
    }

    .layout {
      flex-direction: column;
      padding: 0;
    }

    .nav {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      flex: none;
      padding: 12px 8px;
      background: var(--gm-bg);
      border-right: 1px solid var(--gm-border);
      box-shadow: 0 0 12px rgba(60, 64, 67, 0.2);
      transform: translateX(-100%);
      transition: transform 0.18s ease;
      z-index: 40;
      overflow-y: auto;
    }

    .nav.open {
      transform: translateX(0);
    }

    .nav.collapsed {
      width: 280px;
    }

    .nav.collapsed .nav-label {
      display: inline;
    }

    .nav a {
      height: 40px;
      border-radius: 0 20px 20px 0;
      margin: 0 0 4px;
      padding: 0 1rem;
      font-size: 0.95rem;
    }

    .nav.collapsed a {
      justify-content: flex-start;
      width: auto;
      border-radius: 0 20px 20px 0;
      margin-left: 0;
      padding: 0 1rem;
    }

    .scrim {
      position: fixed;
      inset: 0;
      background: var(--gm-scrim);
      border: 0;
      z-index: 30;
    }

    .content {
      width: 100%;
      height: 100%;
      padding: 0 8px 8px;
    }
  }
</style>