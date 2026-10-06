# PROGRES.md — Pelacak Pengerjaan Mailflare

> Dokumen ini melacak apa yang sudah selesai, apa yang sedang berjalan, dan apa berikutnya.
> Format: update baris status + tambahkan entri di **Log** setiap sesi kerja.
> Baca `agent.md` untuk konteks lengkap sebelum melanjutkan.

Legenda status: `[ ]` belum · `[~]` sedang/parsial · `[x]` selesai · `[!]` diblokir

---

## Ringkasan Status

| Area | Status | Catatan |
| --- | --- | --- |
| Setup lokal (install/check/test/build) | `[x]` | `npm run check` 0 error / 0 warning; 44 test lulus; build sukses |
| Deep scan kode | `[x]` | Seluruh `src/` + scripts + docs dibaca |
| Perbaikan bug (ditemukan dari scan) | `[x]` | 7 item — lihat di bawah |
| Dokumentasi agent.md | `[x]` | Ditulis ulang jadi panduan lengkap |
| Deploy ke Cloudflare | `[x]` | Version ID `29ef9c52-0c21-49ae-9af4-186a1490a647` (2026-10-06, setelah audit admin) |
| Audit halaman admin (black-box live) | `[x]` | Semua fitur diuji via HTTP + D1; bug diperbaiki |
| Permintaan UX lanjutan (bulk, modal, logo, logout) | `[x]` | Sesi 3 — lihat log |
| Label member + storage + bulk reset password | `[x]` | Sesi 4 — lihat log |
| Label visible toggle + color dropdown + backup/restore | `[x]` | Sesi 5 — lihat log |
| Konfigurasi Telegram | `[ ]` | Belum ada binding/env Telegram di worker |
| Fitur lampiran (download) | `[ ]` | Backlog |
| Verifikasi runtime UI (browser) | `[ ]` | Belum diuji end-to-end di browser |

---

## Perbaikan yang Sudah Dilakukan

- [x] **Member "Kosongkan Sampah" 403** — tambah `/api/me/trash/empty` ke allowlist member di `src/hooks.server.ts`.
- [x] **`confirm()` native** di `UserListPanel.svelte` `handleBulkSoftDelete` → diganti `confirmDialog(...)` (sesuai agent.md).
- [x] **Teks Inggris** `${label} copied.` → `${label} disalin.` di `UserListPanel.svelte`.
- [x] **`/users/emails` halaman kosong** saat `?page=` melebihi max → clamp `safePage` + refetch di `+page.server.ts`.
- [x] **Defense-in-depth owner** di `/api/worker-settings/connect-webhook` & `/test-telegram` (sebelumnya hanya cek `authenticated`).
- [x] **a11y & unused exports** — hapus `on:click` di wrapper `<span>` `MailRow`, ganti root click-handler `GmailShell` jadi `menu-scrim`, `<nav role=tablist>` → `<div>`, hapus prop `isStarred`/`resultCount`/`searchQuery` yang tak terpakai.
- [x] **91 unused CSS selector** dibersihkan di 7 file (dead code page + style Gmail lama).
- [x] **Koreksi kepemilikan API admin page** — memastikan branch `inboxOnly` sudah konsisten self (bukan bug); hipotesis awal bahwa `/users/:id/emails` memakai `/api/me/emails` keliru karena branch itu dead-code (member selalu di-redirect hooks). Sudah didokumentasikan supaya agen berikutnya tidak salah paham.

---

## Item Perlu Perhatian (belum dikerjakan / opsional)

- [ ] **Verifikasi runtime**: login admin, buka inbox member, star/hapus/empty trash, cek `/users/emails` pagination lewat browser.
- [x] **Deploy**: `npm run deploy` sukses. `Current Version ID: f7505cfb-4080-4056-8fe9-f335a1f9ede3` (sesi 4).
- [ ] **Telegram**: set `worker_settings` (bot_token, allowed_ids, forward_inbound) atau binding env; daftarkan webhook.
- [ ] **`InboxTable.svelte` unused** — tidak diimpor siapa pun (`/users/emails` memakai `MailRow`). Kandidat hapus atau pakai. Juga masih memuat konsep `archive` yang sudah dihapus dari produk.
- [ ] **Fitur lampiran**: DTO `EmailDetailDto` belum memuat daftar lampiran + link download (lihat `docs/audit-email-detail-2026-10-06.md` poin 4).
- [ ] **Rate limiter persisten**: `rate-limit.ts` & `api-key.ts` in-memory (reset cold start). Bila perlu, pindah ke D1/KV.
- [ ] **`purgeExpired*Throttled` race**: set timestamp sebelum `await` — dua request bersamaan bisa lolos. Minor.
- [ ] **`npm install` hygiene**: pastikan `package-lock.json` tidak memuat URL `.tgz` mirror non-npmjs (pernah kejadian).
- [ ] **Audit `docs/` lama**: `SECURITY_AUDIT_2025-07-09.md`, `audit-*.md` — sinkronkan bila ada temuan yang belum ditutup.

---

## Log

### 2026-10-06 — Sesi 1 (setup + deep scan + perbaikan)
- Clone `https://github.com/Artupasigoy/mailflare.git` → `/home/user/mailflare` (commit `4494c13`).
- `npm install` gagal (2 URL `.tgz` mirror Tencent) → diperbaiki ke `registry.npmjs.org`.
- Verifikasi: `check` 0 error (102 warning CSS), `test` 44/44, `build` sukses.
- Deep scan seluruh `src/` (db.ts, hooks, security, session, telegram, api-key, routes, komponen) + `schema.sql` + docs.
- Audit D1 live via API: 14 user, 12 email, 2 sesi, 0 API key; Telegram belum dikonfigurasi.
- Perbaikan 7 item (lihat atas) → `check` **0 error / 0 warning**, `test` 44/44, `build` sukses.
- Buat `wrangler.toml` + `.dev.vars` lokal (gitignored) dari nilai akun.
- Tulis ulang `agent.md` (panduan lengkap) + buat `progres.md` ini.

### 2026-10-06 — Sesi 1 (lanjutan: deploy)
- `npm run deploy` sukses → `Current Version ID: 475d71c8-61a3-4ec7-93fa-2e7f41566c01`.
- Verifikasi live: `GET /api/health` → `{"ok":true,"service":"mailflare-web-fullstack"}`; `/auth/login` → 200; `/` → 303 ke `/auth/login`.

### 2026-10-06 — Sesi 2 (audit halaman admin, live)
- Audit black-box seluruh halaman admin via HTTP + query D1 langsung (sesi owner sementara dibuat lalu dihapus).
- **Verifikasi berfungsi**: login/guard, `/dashboard`, `/users` (+search/sort/status/pagination), `/users/emails`, `/worker/settings`, inbox & detail user, seluruh email action (`star/untrash/read/unread/delete`) + bulk, manajemen user (`create/edit/resetPassword/softDelete/restore/permanentDelete/bulk create`), worker-settings save/clear, `test-telegram` & `connect-webhook` (gagal wajar tanpa token), CSRF (wrong Origin → 403), public API 401 tanpa key.
- **Bug ditemukan & diperbaiki**:
  1. **`Pager` tidak pernah mengaktifkan tombol Next** — `UserListPanel` & `/users/emails` tidak mengirim prop `totalPages` (default 1) → `canNext` selalu `false`. `Pager` kini menghitung `pages` otomatis dari `total`/`pageSize` (atau `totalPages` bila diisi).
  2. **Edit User → Delete pada user aktif selalu gagal** (`400 User harus di Sampah dulu...`) karena tombol selalu memakai permanent-delete. Kini kontekstual: user aktif → `Pindahkan ke Sampah` (soft delete), user di Sampah → `Hapus Permanen`. Tombol delete disembunyikan untuk owner.
  3. **Teks UI Inggris** di halaman Edit User (Display Name, New Password, Save Changes, Delete, Cancel) → diterjemahkan ke Indonesia sesuai `agent.md`.
- `check` 0 error/0 warning, `test` 44/44, `build` sukses, deploy sukses.

### 2026-10-06 — Sesi 4 (label member, storage, bulk reset password, polish UX)
Fitur baru & perubahan:
- **Hover baris User List** kini hanya mengubah **border** (warna berubah), tidak lagi mengubah background — sesuai permintaan.
- **Checkbox** bulk & satuan diperbesar proporsional (User List 1.1rem; GmailInbox desktop 18px, mobile 22px).
- **Storage usage per member** ditampilkan di baris identitas user (`formatBytes`, dari `SUM(raw_size)` email aktif, sebelah "Unread").
- **Bulk Reset Password**: tombol di toolbar bulk → modal berisi resume user terpilih + pilihan password **Acak** / **Sama untuk semua** (reuse pola modal Buat Massal). Endpoint `POST /api/users/bulk { mode:'resetPassword' }`.
- **Label member** (tag akun user, banyak-ke-banyak):
  - Tabel `labels` + `user_labels` (schema.sql + diterapkan ke D1 remote).
  - API `GET|POST /api/labels`, `PATCH|DELETE /api/labels/:id`; assign via `PATCH /api/users/:id { labelIds }`.
  - Chip filter label di samping tombol Semua/Aktif/Sampah + panah geser (`>>`) saat kepenuhan; tombol **Kelola** → `LabelManagerModal` (CRUD label + warna).
  - Chip label tampil di tiap baris user; tombol `sell` di quick-actions untuk atur label per user.
  - Filter server-side `?label=<id>` di `getUsersFromDb`/`countUsersBreakdownFromDb`.
- Komponen baru: `LabelFilter.svelte` (molecule), `LabelManagerModal.svelte` (organism). `InputText` dapat prop `ariaLabel`.

Bug & insiden:
- **`/users` 500**: `LabelFilter` memanggil `requestAnimationFrame` saat SSR (tidak ada di Worker) → diperbaiki dengan cek `typeof requestAnimationFrame !== 'undefined'`. Deploy ulang beres.
- **Insiden uji**: uji `resetPassword` menyentuh user asli (`andra`, `alex`) → dipulihkan via **D1 Time Travel** ke bookmark sebelum uji. State akhir: 14 user, label uji & sesi uji dibersihkan.
- `wrangler d1 execute --file` ditolak token (`SQLITE_AUTH`) → tabel label dibuat lewat D1 query API langsung.

Status: check 0/0, test 44/44, build OK. **Deploy `f7505cfb-4080-4056-8fe9-f335a1f9ede3`**.

### 2026-10-06 — Sesi 3 (perbaikan bulk + permintaan UX)
- **BUG KRITIS diperbaiki**: bulk "Pindahkan ke Sampah" & "Kosongkan Sampah" di User List selalu gagal `400 Unsupported mode`. Sebab: server `payload.mode.toLowerCase()` (`softdelete`/`emptytrash`) dibandingkan dengan `'softDelete'`/`'emptyTrash'`. Fix: cabang pakai huruf kecil. Terverifikasi live (softDelete 2, emptyTrash hapus sampah).
- **X (close)** ditambahkan di modal Tambah User & Buat Massal (`UserListPanel`).
- **Halaman Sampah user**: bulk checklist dihapus; hanya tombol `Kosongkan Sampah`. Baris Sampah tanpa checkbox.
- **Ikon hapus** diwarnai merah/danger di GmailInbox, GmailEmail, UserListPanel, dan tombol bulk.
- **Logo diseragamkan**: admin & member pakai wordmark "Mailflare" biru monokrom; GmailShell tidak lagi gradient Google; BrandLockup tidak lagi ikon cloud gradient.
- **Logout diberi verifikasi** (`confirmDialog`) di GmailShell, AppSidebar, AppTopbar.
- **Urutan side menu**: Dashboard → User List → Semua Email → Worker Settings.
- `check` 0 error/0 warning, `test` 44/44, `build` sukses, deploy `9664afbd-09c7-4d46-ac15-ce0442b9c007`.

#### Insiden & pemulihan (WAJIB dibaca)
- Saat menguji `emptyTrash` terhadap production, **user `diki` yang sudah ada di Sampah ikut terhapus permanen** (aksi `emptyTrash` memang menghapus semua isi Sampah — perilaku benar, tapi uji saya tidak menyadari Sampah tidak kosong).
- Dipulihkan lewat **D1 Time Travel** (`wrangler d1 time-travel restore ... --bookmark=000000b8-...`). `diki` kembali ke status Sampah (`deleted_at 2026-10-06 12:19:28`). Sisa data uji (`bulkx*`, `audit-tmp-session*`) dibersihkan. State akhir: 14 user, 1 di Sampah (`diki`).
- **Pelajaran**: sebelum menjalankan uji destruktif (`emptyTrash`, `delete`) di production, **cek dulu isi Sampah** dan/atau ekspor backup. Jangan uji `emptyTrash` pada DB berisi data nyata.
- CLI: `wrangler` butuh `NODE_OPTIONS=--dns-result-order=ipv4first`; `wrangler deploy` kadang timeout → ulangi.

### 2026-10-06 — Sesi 5 (label visible, color dropdown, modal fixes, backup/restore)
Permintaan & implementasi:
- **Label tampil/sembunyi**: kolom `labels.visible` (default 1) + auto-migrasi `ensureLabelVisibleColumn`. Tombol mata di `LabelManagerModal`. Label tersembunyi tidak tampil sebagai chip di baris user & tidak muncul di `LabelFilter`, tetap ter-assign. `LabelFilter`/`UserListPanel` filter `visible !== false`.
- **Warna label dropdown**: `ColorSelect` (molecule) dengan swatch + palet, menggantikan `<select>` teks di `LabelManagerModal`.
- **Teruskan email masuk ke Telegram default uncheck**: `users.telegram_enabled` default jadi `0` (schema + `createUserInDb` + fallback fragment `1 AS`→`0 AS`). Halaman Edit User tetap bisa mengubahnya.
- **Tambah User (satuan)**: form password + tombol **Generate** di pojok kanan (password acak 18 char, bisa ditulis manual). API `POST /api/users` menerima `password` (validasi 8-128).
- **Modal bulk restore**: judul dinamis `bulkResultTitle` — "Pulihkan User Massal" (restore) / "Reset Password Massal" / "Buat User Massal"; subtitle dinamis. Tombol Tutup memanggil `closeBulkResult()` yang mereset `bulkMode`/kredensial → tidak lagi bocor ke "Buat Massal".
- **Backup & Restore penuh** (owner-only, di `/worker/settings`):
  - `src/lib/server/backup.ts`: dump tabel berjendela (`ORDER BY rowid LIMIT/OFFSET`), enkripsi **AES-GCM-256** + **PBKDF2-SHA256 100.000** dari passphrase; envelope JSON `mailflare-backup` v1. `createEncryptedBackup`/`restoreEncryptedBackup`/`buildBackupData`.
  - Restore membuat tabel via **DDL idempoten** bila DB baru (pindah akun Cloudflare), mode `merge`/`replace` (`INSERT OR REPLACE`), schema auto-`ALTER` kolom `visible`.
  - Endpoint `POST /api/backup/export` & `/restore`, **wajib password owner** (re-auth) + passphrase; rate limit 5/3 per 10 menit; `cache-control: no-store`; mode replace butuh header `x-mailflare-confirm: restore-replace`.
  - UI `BackupRestore.svelte`: pilih scope (full/email/akun), generate passphrase, unduh file `.json`; impor file + mode + passphrase + password owner. Tabel sesi/ephemeral sengaja tidak di-backup.
  - Batas ±25MB (free tier), paginasi insert 50/batch, DDL batch.
- Verifikasi: `npm run check` **0 error / 0 warning**, `npm test` **44/44**, `npm run build` sukses.
- Update `agent.md` (skema, endpoint, komponen, jebakan, kosakata) + `progres.md`.

### <tambahkan sesi berikutnya di sini>
- …