<script lang="ts">
  import CardSurface from '$lib/components/atoms/CardSurface.svelte';
  import Button from '$lib/components/atoms/Button.svelte';
  import InputText from '$lib/components/atoms/InputText.svelte';
  import Icon from '$lib/components/atoms/Icon.svelte';
  import { toastStore } from '$lib/stores/toast.store';
  import { confirmDialog } from '$lib/stores/confirm.store';

  type BackupScope = 'full' | 'email' | 'account';
  type RestoreMode = 'merge' | 'replace';

  const SCOPE_OPTIONS: Array<{ key: BackupScope; label: string }> = [
    { key: 'full', label: 'Semua data (email + akun + pengaturan)' },
    { key: 'email', label: 'Email saja' },
    { key: 'account', label: 'Akun, label & pengaturan saja' }
  ];

  let exportScope: BackupScope = 'full';
  let exportOwnerPassword = '';
  let exportPassphrase = '';
  let exporting = false;
  let exportMessage = '';
  let exportError = '';

  let importOwnerPassword = '';
  let importPassphrase = '';
  let restoreMode: RestoreMode = 'merge';
  let restoring = false;
  let restoreMessage = '';
  let restoreError = '';
  let selectedFileName = '';
  let envelope: Record<string, unknown> | null = null;

  function generatePassphrase() {
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    let out = '';
    for (const byte of bytes) {
      out += alphabet[byte % alphabet.length];
    }
    exportPassphrase = out;
    importPassphrase = out;
  }

  async function handleExport() {
    if (exporting) return;
    exportError = '';
    exportMessage = '';
    if (exportOwnerPassword.trim().length < 8) {
      exportError = 'Masukkan password akun owner untuk konfirmasi.';
      return;
    }
    if (exportPassphrase.length < 12) {
      exportError = 'Passphrase backup minimal 12 karakter.';
      return;
    }

    exporting = true;
    try {
      const response = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          password: exportOwnerPassword.trim(),
          passphrase: exportPassphrase,
          scope: exportScope
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; envelope?: Record<string, unknown>; totalRows?: number }
        | null;
      if (!response.ok || !payload?.ok || !payload.envelope) {
        exportError = payload?.error ?? 'Gagal membuat backup.';
        return;
      }

      const blob = new Blob([JSON.stringify(payload.envelope)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mailflare-backup-${date}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      exportMessage = `Backup (${payload.totalRows ?? 0} baris) berhasil diunduh. Simpan file & passphrase dengan aman.`;
      exportOwnerPassword = '';
      toastStore.success('Backup berhasil diunduh');
    } catch {
      exportError = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      exporting = false;
    }
  }

  async function handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    restoreError = '';
    restoreMessage = '';
    envelope = null;
    selectedFileName = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      envelope = parsed;
      selectedFileName = file.name;
    } catch {
      restoreError = 'File tidak bisa dibaca. Pastikan file backup .json yang benar.';
      input.value = '';
    }
  }

  async function handleRestore() {
    if (restoring) return;
    restoreError = '';
    restoreMessage = '';
    if (!envelope) {
      restoreError = 'Pilih file backup terlebih dahulu.';
      return;
    }
    if (importOwnerPassword.trim().length < 8) {
      restoreError = 'Masukkan password akun owner untuk konfirmasi.';
      return;
    }
    if (!importPassphrase) {
      restoreError = 'Passphrase backup wajib diisi.';
      return;
    }

    if (restoreMode === 'replace') {
      const ok = await confirmDialog({
        title: 'Restore Ganti Total',
        message: 'SEMUA data yang tercakup scope backup akan dihapus dan diganti dengan isi file. Tindakan ini tidak bisa dibatalkan.',
        confirmLabel: 'Ganti & Restore',
        danger: true
      });
      if (!ok) return;
    }

    restoring = true;
    try {
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(restoreMode === 'replace' ? { 'x-mailflare-confirm': 'restore-replace' } : {})
        },
        body: JSON.stringify({
          password: importOwnerPassword.trim(),
          passphrase: importPassphrase,
          mode: restoreMode,
          envelope
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; totalRows?: number; summary?: { restored?: Record<string, number> } }
        | null;
      if (!response.ok || !payload?.ok) {
        restoreError = payload?.error ?? 'Gagal memulihkan backup.';
        return;
      }
      const detail =
        payload.summary?.restored
          ? Object.entries(payload.summary.restored)
              .filter(([, count]) => count > 0)
              .map(([table, count]) => `${table}: ${count}`)
              .join(', ')
          : '';
      restoreMessage = `Restore selesai (${payload.totalRows ?? 0} baris)${detail ? ` — ${detail}` : ''}`;
      importOwnerPassword = '';
      importPassphrase = '';
      envelope = null;
      selectedFileName = '';
      toastStore.success('Restore berhasil');
    } catch {
      restoreError = 'Gagal menghubungi server. Coba lagi.';
    } finally {
      restoring = false;
    }
  }
</script>

<CardSurface>
  <h2>Backup & Restore Data</h2>
  <p class="text-muted">
    Ekspor seluruh data (email termasuk isi/raw MIME, akun, label, dan pengaturan Telegram) ke satu file
    terenkripsi. Cocok untuk pindah akun Cloudflare atau pemulihan. File diamankan dengan passphrase dan
    hanya bisa diakses owner.
  </p>

  <div class="security-note">
    <Icon name="shield" size={16} />
    <span>Wajib konfirmasi password akun owner. Passphrase tidak dikirim/disimpan ke server.</span>
  </div>

  <div class="grid">
    <section class="pane">
      <h3>Backup (Ekspor)</h3>
      <div class="field">
        <label for="backup-scope">Cakupan data</label>
        <select id="backup-scope" bind:value={exportScope}>
          {#each SCOPE_OPTIONS as option (option.key)}
            <option value={option.key}>{option.label}</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label for="backup-passphrase">Passphrase enkripsi</label>
        <div class="gen-shell">
          <InputText id="backup-passphrase" bind:value={exportPassphrase} placeholder="Minimal 12 karakter" type="text" />
          <button class="gen-btn" type="button" title="Buat passphrase acak" aria-label="Buat passphrase acak" on:click={generatePassphrase}>
            <Icon name="casino" size={16} />
          </button>
        </div>
        <p class="hint text-muted">Simpan passphrase ini. Tanpa passphrase, file backup tidak bisa dibuka.</p>
      </div>
      <div class="field">
        <label for="backup-owner-password">Password akun owner</label>
        <InputText id="backup-owner-password" bind:value={exportOwnerPassword} placeholder="Konfirmasi password owner" type="password" />
      </div>
      <div class="actions">
        <Button type="button" on:click={handleExport} disabled={exporting}>
          {exporting ? 'Membuat...' : 'Unduh Backup'}
        </Button>
      </div>
      {#if exportMessage}<p class="feedback success">{exportMessage}</p>{/if}
      {#if exportError}<p class="feedback error">{exportError}</p>{/if}
    </section>

    <section class="pane">
      <h3>Restore (Impor)</h3>
      <div class="field">
        <label for="restore-file">File backup (.json)</label>
        <input id="restore-file" class="file-input" type="file" accept="application/json,.json" on:change={handleFile} />
        {#if selectedFileName}<p class="hint text-muted">Terpilih: {selectedFileName}</p>{/if}
      </div>
      <div class="field">
        <label for="restore-mode">Mode restore</label>
        <select id="restore-mode" bind:value={restoreMode}>
          <option value="merge">Gabung (tambahkan/perbarui, aman)</option>
          <option value="replace">Ganti total (hapus lalu isi ulang)</option>
        </select>
      </div>
      <div class="field">
        <label for="restore-passphrase">Passphrase backup</label>
        <InputText id="restore-passphrase" bind:value={importPassphrase} placeholder="Passphrase saat backup dibuat" type="text" />
      </div>
      <div class="field">
        <label for="restore-owner-password">Password akun owner</label>
        <InputText id="restore-owner-password" bind:value={importOwnerPassword} placeholder="Konfirmasi password owner" type="password" />
      </div>
      <div class="actions">
        <Button type="button" variant="secondary" on:click={handleRestore} disabled={restoring || !envelope}>
          {restoring ? 'Memulihkan...' : 'Mulai Restore'}
        </Button>
      </div>
      {#if restoreMessage}<p class="feedback success">{restoreMessage}</p>{/if}
      {#if restoreError}<p class="feedback error">{restoreError}</p>{/if}
    </section>
  </div>
</CardSurface>

<style>
  h2 {
    font-size: 1.2rem;
    margin-bottom: 0.2rem;
  }

  h3 {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }

  .security-note {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: var(--space-3);
    padding: 0.4rem 0.7rem;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--color-warning), transparent 55%);
    background: color-mix(in srgb, var(--color-warning), transparent 92%);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .grid {
    margin-top: var(--space-4);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-5);
  }

  .pane {
    display: grid;
    gap: var(--space-3);
    align-content: start;
    padding: var(--space-3);
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 78%);
    border-radius: var(--radius-md);
  }

  .field {
    display: grid;
    gap: 0.35rem;
  }

  label {
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: var(--font-size-label-xs);
    font-weight: 700;
  }

  select,
  .file-input {
    width: 100%;
    border: 1px solid color-mix(in srgb, var(--color-outline), transparent 55%);
    background: var(--color-surface-card);
    color: var(--color-text);
    border-radius: var(--radius-md);
    padding: 0.7rem 0.7rem;
    font-size: 0.82rem;
    font-family: inherit;
  }

  .gen-shell {
    position: relative;
  }

  .gen-shell :global(.input) {
    padding-right: 3rem;
  }

  .gen-btn {
    position: absolute;
    right: 0.4rem;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid color-mix(in srgb, var(--color-primary-500), transparent 45%);
    background: color-mix(in srgb, var(--color-primary-500), transparent 92%);
    color: var(--color-primary-500);
    border-radius: 0.6rem;
    cursor: pointer;
  }

  .hint {
    margin: 0;
    font-size: 0.76rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .feedback {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .feedback.success {
    color: #0f7b3d;
  }

  .feedback.error {
    color: #bb1f2f;
  }

  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }
  }
</style>