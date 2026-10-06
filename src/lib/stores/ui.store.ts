import { writable, type Writable } from 'svelte/store';

const defaultSidebarCollapsed =
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 960px)').matches : false;

export const sidebarCollapsed = writable(defaultSidebarCollapsed);

/** Tema gelap untuk halaman ADMIN (owner). Default: terang. */
export const adminDarkMode: Writable<boolean> = writable(false);

const ADMIN_KEY = 'theme_admin';
const LAST_SCOPE_KEY = 'theme_last_scope';

export type ThemeScope = 'admin' | 'member';

function readTheme(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(key) === 'dark';
  } catch {
    return false;
  }
}

function writeTheme(key: string, isDark: boolean) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, isDark ? 'dark' : 'light');
  } catch {
    // Abaikan jika storage diblokir.
  }
}

export function applyTheme(isDark: boolean) {
  if (typeof document === 'undefined') {
    return;
  }
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function isDarkFor(scope: ThemeScope): boolean {
  // Member selalu terang.
  return scope === 'admin' ? readTheme(ADMIN_KEY) : false;
}

export function readLastScope(): ThemeScope {
  if (typeof window === 'undefined') {
    return 'member';
  }
  try {
    return window.localStorage.getItem(LAST_SCOPE_KEY) === 'admin' ? 'admin' : 'member';
  } catch {
    return 'member';
  }
}

/** Terapkan tema untuk scope tertentu + catat scope terakhir (dipakai anti-FOUC di app.html). */
export function applyThemeForScope(scope: ThemeScope): boolean {
  // Member selalu terang; hanya admin yang punya preferensi gelap.
  const isDark = scope === 'admin' ? isDarkFor('admin') : false;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_SCOPE_KEY, scope);
    }
  } catch {
    // Abaikan jika storage diblokir.
  }
  applyTheme(isDark);
  return isDark;
}

export function setTheme(scope: ThemeScope, isDark: boolean) {
  // Halaman member hanya terang; tema gelap hanya untuk admin.
  if (scope === 'member') {
    return;
  }
  writeTheme(ADMIN_KEY, isDark);
  applyThemeForScope('admin');
  adminDarkMode.set(isDark);
}

export function toggleTheme(scope: ThemeScope) {
  setTheme(scope, !readTheme(ADMIN_KEY));
}

if (typeof window !== 'undefined') {
  adminDarkMode.set(readTheme(ADMIN_KEY));
  // Terapkan tema scope terakhir sejak awal (anti-FOUC); +layout.svelte akan
  // mengoreksi ke scope yang sesuai role setelah hydrasi.
  applyThemeForScope(readLastScope());
}