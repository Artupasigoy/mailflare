<script lang="ts">
  import '../app.css';
  import { page, navigating } from '$app/stores';
  import MobileBottomNav from '$lib/components/organisms/MobileBottomNav.svelte';
  import ToastHost from '$lib/components/atoms/ToastHost.svelte';
  import { applyThemeForScope, type ThemeScope } from '$lib/stores/ui.store';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  $: pathname = $page.url.pathname;
  $: showAppNav = !pathname.startsWith('/auth') && !pathname.startsWith('/api');
  $: showOwnerMobileNav = showAppNav && data.sessionRole === 'owner';

  // Terapkan tema sesuai role: admin & member punya preferensi terpisah (default terang).
  $: themeScope = (data.sessionRole === 'owner' ? 'admin' : 'member') as ThemeScope;
  $: applyThemeForScope(themeScope);
</script>

<div class={`app-frame ${showOwnerMobileNav ? 'with-mobile-nav' : ''}`}>
  {#if $navigating}
    <div class="nav-progress" aria-hidden="true"></div>
  {/if}
  <slot />
</div>

{#if showOwnerMobileNav}
  <MobileBottomNav />
{/if}

<ToastHost />

<style>
  .app-frame {
    min-height: 100dvh;
    position: relative;
  }

  .nav-progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--color-primary-500);
    z-index: 100;
    width: 100%;
    animation: navprogress 0.8s ease-in-out infinite;
    transform-origin: left center;
  }

  @keyframes navprogress {
    0% { transform: scaleX(0.2); opacity: 1; }
    50% { transform: scaleX(0.7); opacity: 1; }
    100% { transform: scaleX(1); opacity: 0.2; }
  }

  @media (max-width: 960px) {
    .app-frame.with-mobile-nav {
      padding-bottom: var(--mobile-nav-height);
    }
  }
</style>
