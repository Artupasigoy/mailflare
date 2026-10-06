<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  export let bodyHtml = '';
  export let bodyText = '';
  export let snippet = '';

  let frameEl: HTMLIFrameElement | undefined;
  let frameHeight = 300;
  let observer: ResizeObserver | undefined;
  let timers: ReturnType<typeof setTimeout>[] = [];
  let themeObserver: MutationObserver | undefined;

  $: hasHtml = bodyHtml.trim().length > 0;
  $: plainText = (bodyText || snippet || '(No Content)').trim();
  $: frameSrcDoc = buildFrameSrcDoc(bodyHtml);

  function buildFrameSrcDoc(rawHtml: string): string {
    const html = rawHtml.trim();
    if (!html) {
      return '';
    }

    if (/<html[\s>]/i.test(html)) {
      return html;
    }

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
  }

  function clearTimers() {
    timers.forEach((timer) => clearTimeout(timer));
    timers = [];
  }

  // Email-HTML sering tidak menentukan warna teks/latar sendiri. Yang diubah hanya
  // WARNA TEKS (agar tetap terbaca); background mengikuti tema aplikasi ( transparan ).
  function applyTheme() {
    try {
      const doc = frameEl?.contentDocument;
      if (!doc?.body || !doc.documentElement) {
        return;
      }

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const foreground = isDark ? '#e3e6ea' : '#202124';

      doc.documentElement.style.backgroundColor = 'transparent';
      doc.body.style.backgroundColor = 'transparent';
      doc.documentElement.style.color = foreground;
      doc.body.style.color = foreground;

      let styleEl = doc.getElementById('__mailflare_theme') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = '__mailflare_theme';
        doc.head?.appendChild(styleEl);
      }

      styleEl.textContent = isDark
        ? `body, body p, body div, body span, body em, body strong, body b, body i, body small,
           body h1, body h2, body h3, body h4, body h5, body h6, body ul, body ol, body li,
           body td, body th, body label, body blockquote, body pre, body code, body a {
             color: ${foreground} !important;
           }
           body a { text-decoration-color: ${foreground}; }`
        : '';
    } catch {
      // Abaikan bila dokumen tidak bisa diakses.
    }
  }

  // Ikuti perubahan tema real-time (member & admin memakai token terpisah).
  function watchTheme() {
    themeObserver?.disconnect();
    themeObserver = new MutationObserver(() => applyTheme());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function syncHeight() {
    try {
      const doc = frameEl?.contentDocument;
      const body = doc?.body;
      if (!body) {
        return;
      }

      // Hanya ukuran isi body yang dipakai (html.scrollHeight bisa ikut ukuran
      // viewport iframe sehingga membuat iframe terlalu tinggi).
      const next = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        Math.ceil(body.getBoundingClientRect().height)
      );

      frameHeight = Math.min(Math.max(next, 200), 30000);

      observer?.disconnect();
      observer = new ResizeObserver(() => syncHeight());
      observer.observe(body);
    } catch {
      // Abaikan jika dokumen tidak bisa diukur.
    }
  }

  function scheduleSyncs() {
    clearTimers();
    frameHeight = 300;
    applyTheme();
    watchTheme();
    [60, 250, 800, 1600].forEach((delay) => {
      timers.push(
        setTimeout(() => {
          applyTheme();
          syncHeight();
        }, delay)
      );
    });
  }

  onMount(() => {
    const handleResize = () => {
      applyTheme();
      syncHeight();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  onDestroy(() => {
    clearTimers();
    observer?.disconnect();
    themeObserver?.disconnect();
  });
</script>

{#if hasHtml}
  <iframe
    bind:this={frameEl}
    title="Email HTML Preview"
    class="email-frame"
    sandbox="allow-same-origin"
    loading="lazy"
    referrerpolicy="no-referrer"
    scrolling="no"
    style={`height:${frameHeight}px`}
    srcdoc={frameSrcDoc}
    on:load={scheduleSyncs}
  ></iframe>
{:else}
  <pre>{plainText}</pre>
{/if}

<style>
  .email-frame {
    display: block;
    width: 100%;
    min-height: 200px;
    max-height: none;
    border: 0;
    background: transparent;
    color-scheme: normal;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    margin: 0;
    padding: 0;
    background: transparent;
    color: inherit;
  }
</style>