# AGENT.md — Mailflare (Cloud Mail Flare)

> **BACA FILE INI SAMPAI HABIS SEBELUM MENYENTUH KODE.**
> Dokumen ini adalah satu-satunya sumber onboarding: arsitektur, data, API, UI, konvensi, deployment, dan jebakan. Bila menemukan fakta baru, **perbarui file ini** dan catat progres di `progres.md`.
> Bagian **"Standar Penamaan (WAJIB)"**, **"Cloudflare Free Tier — WAJIB efisien"**, dan **"Komponen & kode — WAJIB reusable"** bersifat mengikat: nama halaman, istilah, komponen, tombol, label, kelas CSS, event, endpoint HARUS memakai nama yang sudah ada. Dilarang membuat istilah/komponen baru bila padanan sudah ada.

---

## 1. Apa itu Mailflare?

Aplikasi web manajemen email **self-hosted** yang berjalan **100% di infrastruktur Cloudflare** (Workers + D1 + Email Routing + Turnstile), **gratis**, receive-only (tidak ada compose/kirim/balas). Satu file Worker melayani UI (SvelteKit), API, **dan** penerimaan email (`email()` handler) + notifikasi Telegram.

- Bahasa UI: **Indonesia**. Kode/variabel/fungsi: **Inggris**.
- Budget: Cloudflare **free tier** → hemat query D1, hindari N+1, throttle housekeeping.

---

## 2. Arsitektur & Runtime

```
Cloudflare Email Routing (catch-all *@MAIL_DOMAIN)
        │  (email masuk)
        ▼
Worker.fetch  ──► SvelteKit (UI + /api/*)
Worker.email  ──► __mailflareHandleInboundEmail
        │            ├─ resolveRecipient (D1 lookup)
        │            └─ POST /api/telegram/notify-email (internal fetch)
        ▼
D1 (SQLite)  ──► users, emails, sessions, api_keys, worker_settings, ...
```

- **`src/hooks.server.ts`** = gerbang utama: autentikasi session, redirect, role guard (owner/member), CSRF, security headers + CSP.
- **SvelteKit adapter Cloudflare** menghasilkan `.svelte-kit/cloudflare/_worker.js`.
- **`scripts/postbuild-add-email-handler.mjs`** (jalan saat `npm run build`) menyuntik fungsi `email()` + `scheduled()` ke `_worker.js` karena adapter tidak mengekspos email handler. Script ini membaca `[vars]` dari `wrangler.toml` sebagai fallback: `MAILFLARE_USER_DOMAIN`, `MAILFLARE_NOTIFY_URL`.
- **Tidak ada cron** (`[triggers]` dilarang; butuh subdomain `workers.dev` → error `10063`). Housekeeping dijalankan **lazy + throttle**.

---

## 3. Struktur Folder (annotasi)

```
src/
├─ app.html                 # anti-FOUC: script tema jalan sebelum paint
├─ app.css                  # token warna (--gm-*, --color-*), .layout-shell .main
├─ app.d.ts                 # tipe App.Locals (auth) + App.Platform.env (bindings)
├─ hooks.server.ts          # auth gate, role guard, CSRF, security headers, CSP
├─ lib/
│  ├─ components/
│  │  ├─ atoms/             # Avatar,Badge,Button,CardSurface,Checkbox,ConfirmDialogHost,
│  │  │                     # Icon,InputText,InputTextarea,ToastHost
│  │  ├─ molecules/         # BackLink,BrandLockup,ColorSelect,EmailBodyViewer,FieldLabelInput,
│  │  │                     # LabelFilter,MailRow,MetricCard,Pager,SearchField,SearchSortBar,
│  │  │                     # SidebarNavItem,StatusFilter
│  │  └─ organisms/         # AccessCodeModal,AppSidebar,AppTopbar,BackupRestore,DashboardMetricsGrid,
│  │                        # GmailEmail,GmailInbox,GmailShell,GmailTabs,InboxTable,LabelManagerModal,
│  │                        # LoginModal,MailboxTopbar,MobileBottomNav,UserListPanel,WorkerSettingsForm
│  ├─ server/
│  │  ├─ db.ts              # SEMUA query D1 + DTO mapping + fallback demo data
│  │  ├─ security.ts        # hashPassword/verifyPassword PBKDF2-SHA256, sha256Hex, randomToken, generateSecurePassword
│  │  ├─ backup.ts          # enkripsi/dekripsi AES-GCM-256 + PBKDF2, dump/restore tabel D1 (backup penuh)
│  │  ├─ session.ts         # login_sessions: create/get/revoke, cookie, extractClientIp/UserAgent
│  │  ├─ api-key.ts         # cmf_v1_ API key, auth public API, rate limit per key
│  │  ├─ access-code.ts     # kode satu kali MF-XXXX-XXXX-XXXX
│  │  ├─ rate-limit.ts      # in-memory sliding window (login/access-code)
│  │  ├─ rendered-email.ts  # HTML→teks untuk public API read_email
│  │  ├─ telegram.ts        # bot Telegram (1520 baris): webhook, perintah, notifikasi, MarkdownV2
│  │  └─ services/          # users.service.ts, dashboard.service.ts, worker-settings.service.ts
│  ├─ stores/               # toast.store, confirm.store, ui.store (tema + sidebar)
│  └─ types/dto.ts          # UserDto, EmailDto, EmailDetailDto, DashboardDto, WorkerSettingsDto
└─ routes/                  # halaman + /api/*
scripts/                     # postbuild, prebuild-clean, telegram-webhook, purge-users, sync-d1, smoke
schema.sql                   # SOURCE OF TRUTH skema D1 (idempotent)
wrangler.toml                # (gitignored) konfigurasi deploy — lihat bagian Deploy
.dev.vars                    # (gitignored) secrets lokal
agent.md / progres.md        # dokumen ini + pelacak progres
```

---

## 4. Peran & Akses

| Role   | Akses |
| ------ | ----- |
| owner  | Semua: `/dashboard`, `/users*`, `/worker/settings`, inbox **semua** user (`/users/:id/inbox`), `/users/emails` |
| member | Hanya inbox sendiri: `/me/inbox`, `/me/emails/*` |

**Owner ditentukan** oleh user paling awal: `SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1` (subquery `owner` di banyak query). Owner **selalu dilindungi** dari soft-delete/permanent-delete/restore.

### Gerbang `hooks.server.ts`

1. Baca cookie `mailflare_session` → `getSessionByToken(db, token)`. Gagal → hapus cookie.
2. Belum login & bukan public path → API `401` / halaman `redirect(303,'/auth/login')`.
3. **Public path** (tanpa login): `/_app/*`, `/auth/*`, `/api/auth/{login,logout,access-code}`, `/api/health`, `/api/telegram/{webhook,notify-email}`, `/api/public/v1/*`.
4. **Member allowlist** (role != owner). Path non-API hanya `/me/inbox` & `/me/emails/*` (selain itu `redirect` ke `/me/inbox`). API diizinkan:
   `GET /api/auth/logout`, `/api/auth/access-code`, `/api/health`, `/api/me`, `/api/me/inbox`, `/api/me/trash/empty`, `/api/me/emails/*`. Selain itu → `403 Forbidden: inbox-only account`.
   > ⚠️ Jika menambah endpoint member baru (mis. `/api/me/...`), **WAJIB** tambahkan ke allowlist ini atau akan kena 403.
5. **CSRF**: request non-GET/HEAD ke `/api/*` wajib `Origin`/`Referer` hostname == host. Webhook publik & `/api/public/v1/*` dikecualikan.
6. **Security headers**: `X-Content-Type-Options`, `X-Frame-Options=DENY`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`, HSTS (https), dan **CSP** (izinkan Turnstile `challenges.cloudflare.com`, Google Fonts, `'unsafe-inline'` script/style).

> **Defense-in-depth**: setiap route `/api/*` tetap cek `locals.authenticated` + `sessionRole` sendiri, jangan hanya mengandalkan hooks.

---

## 5. Model Data (`schema.sql`)

Tabel: `users`, `emails`, `email_status_history`, `worker_metrics`, `worker_settings`, `access_codes`, `access_sessions`, `login_sessions`, `telegram_webhook_updates`, `api_keys`. Index penting: `idx_emails_user_inbox`, `idx_emails_user_flags`, `idx_emails_global_metrics`, plus index expiry untuk session/access code.

Status (satu sumber kebenaran):
- Email: `is_read`, `is_starred`, `is_archived` (kolom tetap ada tapi **arsip tidak dipakai UI**), `deleted_at` (Sampah).
- User: `password_hash IS NULL` → nonaktif/tidak bisa login; `deleted_at` → di Sampah. Soft delete = `password_hash=NULL`+`deleted_at=NOW()`, **email & nama disimpan** agar bisa restore.
- Retensi: email Sampah & user Sampah = **30 hari** (`TRASH_RETENTION_DAYS`, `SOFT_DELETED_RETENTION_DAYS`).

`schema.sql` **selalu idempotent** (`CREATE ... IF NOT EXISTS`, `DROP INDEX IF EXISTS`), aman dijalankan ke DB production berulang.

Tambahan skema:
- **`labels.visible`** (default 1): `0` = label disembunyikan — tidak tampil sebagai chip di baris user & tidak muncul di `LabelFilter`, tetapi tetap ter-assign ke user. Dibuat otomatis via `ensureLabelVisibleColumn` bila DB lama belum memilikinya.
- **`users.telegram_enabled`** default **0** (tidak diteruskan) — user baru tidak otomatis meneruskan email ke Telegram. Diubah per user di halaman Edit User atau `PATCH /api/users/:userId { telegramEnabled }`.

---

## 6. Backend — `src/lib/server/`

- **`db.ts`** (~2800 baris) — SEMUA akses D1. Fungsi penting:
  - Users: `getUsersFromDb`, `countUsersBreakdownFromDb` (1 query 4 hitungan), `getUserByIdFromDb`, `getUserByEmailFromDb`, `getUserAuthByEmail`, `createUserInDb`, `createUsersInDb` (bulk batch), `updateUserInDb`, `deleteUserInDb`, `softDeleteUserInDb`, `softDeleteUsersInDb`, `deleteTrashedUsersInDb`, `deleteUsersInDb`, `deleteUserPermanentlyInDb`, `restoreUserInDb`, `purgeExpiredSoftDeletedUsersInDb`.
  - Emails: `upsertInboundEmailInDb` (parse MIME via `postal-mime` + fallback manual), `getUserInboxFromDb`, `getUserTrashFromDb`, `searchUserInboxFromDb`, `getEmailByIdFromDb`, `getAllInboxEmailsFromDb` (admin), `bulkUpdateEmailsInDb` (1 `IN(...)`), `applyEmailQuickActionInDb`, `emptyTrashForUserInDb`, `purgeExpiredTrashInDb`.
  - Lain: `getDashboardOverview` (banyak COUNT paralel, ~16 query), `getWorkerSettingsFromDb`, `updateWorkerSettingsInDb`.
  - Caching: `hasTelegramEnabledColumn` pakai `WeakMap<D1Database,boolean>` (per-instance, bukan global).
  - Fallback demo data dipakai bila `db` undefined (`dev` tanpa `cf:dev`).
- **`security.ts`** — PBKDF2-SHA256 **100.000 iterasi** (batas runtime CF), format `pbkdf2_sha256$iter$salt$derived`; `randomToken()` base64url 32 byte; `generateSecurePassword(18)`; `sha256Hex`.
- **`session.ts`** — cookie `mailflare_session`, umur 7 hari (`SESSION_MAX_AGE_SECONDS`), token di-hash SHA-256 sebelum disimpan; role dihitung dari owner.
- **`api-key.ts`** — prefix `cmf_v1_`, key di-hash SHA-256; `authenticatePublicApiRequest` + rate limit in-memory 120 req/menit/key.
- **`access-code.ts`** — `MF-XXXX-XXXX-XXXX`, hash SHA-256, TTL 10 menit, sekali pakai.
- **`rate-limit.ts`** — in-memory sliding window; login 10/menit/IP, access-code 5/menit/IP. Reset saat cold start (diterima).
- **`rendered-email.ts`** — prioritas konten `parsed_html > body_html > parsed_text > body_text > snippet`, max 20.000 char.
- **`telegram.ts`** — load config dari `worker_settings` (fallback env): `bot_token`, `webhook_secret`, `allowed_ids`, `forward_inbound`, `target_mode`, `chat_id`. Perintah: `/adduser`, `/listuser`, `/inbox`, `/readmail`, `/access`, `/reset`, `/apikey [regen]`, `/help`. Semua teks MarkdownV2 di-escape. Dedup update via `telegram_webhook_updates`.
- **`services/*.service.ts`** — pembungkus `RequestEvent`→`db.ts` + housekeeping throttle (`purgeExpiredTrashThrottled`, `purgeExpiredSoftDeletedUsersThrottled`, throttle 10 menit per isolate) dipanggil dari `+layout.server.ts`.

---

## 7. API Endpoints

### Auth
| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/login` | publik (Turnstile wajib; bootstrap owner via `SETUP_TOKEN` bila DB kosong) |
| GET/POST | `/api/auth/logout` | publik |
| POST | `/api/auth/access-code` | publik (Turnstile, kode MF) |
| GET | `/api/health` | publik |

### Member (owner juga boleh)
`GET /api/me`, `GET /api/me/inbox`, `GET|PATCH /api/me/emails/:id`, `POST /api/me/emails/bulk`, `POST /api/me/trash/empty`.
Email action: `star | delete | untrash | read | unread`.

### Admin (owner)
- `GET|POST /api/users` (list/create), `GET|PATCH|DELETE /api/users/:userId`, `POST /api/users/bulk`.
  - `PATCH` body: `{ email, displayName, password, resetPassword, restore, telegramEnabled }`.
  - `DELETE` header `x-mailflare-confirm: soft-delete-user | delete-user`.
  - `POST /bulk` body `{ mode: 'create'|'restore'|'softDelete'|'delete'|'emptyTrash'|'resetPassword', usernames?, userIds?, password? }` (maks 100, notify Telegram maks 10). `resetPassword` me-reset password user terpilih (Acak per-user atau `password` bersama), mencabut sesi lama, melewati owner & user non-aktif, dan mengembalikan daftar kredensial.
  > **PENTING**: server men-`toLowerCase()` nilai `mode`, jadi cabang `if` memakai **huruf kecil** (`softdelete`, `emptytrash`). Jangan bandingkan dengan camelCase. UI tetap mengirim camelCase (`softDelete`).
- `GET /api/users/:userId/inbox`, `GET|PATCH /api/users/:userId/emails/:id`, `POST /api/users/:userId/emails/bulk`, `POST /api/users/:userId/trash/empty`.
- `GET /api/dashboard`.
- `GET|PATCH /api/worker-settings`, `GET /api/worker-settings/api-key`, `POST .../api-key/generate`, `POST .../api-key/regenerate`, `POST /api/worker-settings/connect-webhook`, `POST /api/worker-settings/test-telegram`.
- **Label**: `GET|POST /api/labels`, `PATCH|DELETE /api/labels/:labelId`. Body bisa menyertakan `visible: boolean` (tampil/sembunyi). Assign label ke user lewat `PATCH /api/users/:userId` body `{ labelIds: string[] }` (mengganti seluruh set label user). Tambah label ke banyak user lewat `POST /api/users/bulk` body `{ mode: 'addLabels', userIds: string[], labelIds: string[] }` (menambah tanpa menghapus; `INSERT OR IGNORE`).
- **Backup/Restore** (owner-only, wajib password owner sebagai re-auth):
  - `POST /api/backup/export` body `{ password, passphrase, scope: 'full'|'email'|'account' }` → `{ envelope }` (file terenkripsi AES-GCM-256; passphrase via PBKDF2-SHA256; unduh di client). Rate limit 5/10 menit.
  - `POST /api/backup/restore` body `{ password, passphrase, mode: 'merge'|'replace', envelope }`, header `x-mailflare-confirm: restore-replace` untuk mode replace → `{ summary }`. Rate limit 3/10 menit. Membuat tabel via DDL idempoten bila DB baru (pindah akun Cloudflare).

### Public API v1 (header `x-api-key: cmf_v1_...` atau `Authorization: Bearer`)
`POST /api/public/v1/create_user`, `GET /api/public/v1/list_user`, `GET /api/public/v1/user_mailbox`, `GET /api/public/v1/read_email`.
Catatan: `user_mailbox` & `read_email` hanya untuk API key yang **tertaut ke user** (`api_keys.user_id`).

### Internal/Webhook (dikecualikan CSRF)
`POST /api/telegram/webhook` (cek `x-telegram-bot-api-secret-token`), `POST /api/telegram/notify-email` (secret `x-mailflare-telegram-secret` / marker internal).

---

## 8. Halaman & Komponen

| Halaman | Route | Komponen utama |
| --- | --- | --- |
| Daftar user (admin) | `/users?status=all\|active\|deleted&q=&sort=&page=` | `UserListPanel` |
| Tambah user | `/users/add` | — |
| Edit user | `/users/[userId]/edit` | — |
| Inbox user (admin & member) | `/users/[userId]/inbox?view=inbox\|starred\|trash`, `/me/inbox` | `GmailInbox` |
| Semua email (admin) | `/users/emails?q=&page=` | `InboxTable`/`MailRow` |
| Detail email | `/me/emails/[emailId]`, `/users/[userId]/emails/[emailId]` | `GmailEmail` |
| Dashboard | `/dashboard` | `DashboardMetricsGrid` |
| Worker settings | `/worker/settings` | `WorkerSettingsForm` |
| Login / access-code | `/auth/login`, `/auth/access-code` | `LoginModal`, `AccessCodeModal` |

### Komponen reusable (WAJIB dipakai ulang)
- **`GmailShell`** — shell app: top bar (hamburger, logo, search pill, avatar+menu) + sidebar (desktop collapse / mobile drawer + scrim) + area konten (`<slot/>`). Dipakai semua halaman inbox & detail member.
- **`GmailInbox`** — daftar email Gmail. Props: `emails`, `trashEmails`, `emailHrefPrefix`, `apiHrefPrefix`, `isSearching`, `view`, `trashEmptyUrl`. Termasuk bulk select (indeterminate), bulk baca/belum baca, bulk hapus, aksi hover, pagination 50/halaman. **Menggabungkan `MailRow`**.
- **`MailRow`** (molecule) — baris email seragam. Props: `href,sender,subject,snippet,receivedAt,isRead,recipient,showLeading,showRecipient,showStar,showTime,showActions,selected`. Slot: `leading`, `star`, `actions`. Grid desktop/mobile diatur di sini (pakai `has-leading`/`has-recipient`).
- **`GmailTabs`** — tab Kotak Masuk/Berbintang/Sampah. Props: `view`, `basePath`, `searchQuery`.
- **`GmailEmail`** — detail email. Props: `email`, `apiBase`, `backHref`, `showBack`, `view`, `recipientLabel`.
- **`UserListPanel`** — panel manajemen user (modal tambah/bulk, quick actions, bulk). Semua konfirmasi lewat `confirmDialog` (bukan `confirm()` native).
- **`Pager`** — pagination reusable. Props: `page`, `total`, `pageSize`, `label`, `onPage`, `totalPages` (opsional). **Bila `totalPages` tidak diisi (default 0), jumlah halaman dihitung otomatis dari `total`/`pageSize`** — jangan lupa kirim `total` yang benar atau tombol Next akan salah.
- **`InboxTable`** — **tidak dipakai** oleh halaman manapun (halaman `/users/emails` memakai `MailRow`). Kandidat dihapus/dirapikan; masih memuat konsep `archive` yang sudah dihapus dari produk.
- **`LabelFilter`** (molecule) — deretan chip label + tombol "Kelola", untuk memfilter daftar user. Props: `labels`, `value` (labelId terpilih), `onChange`, `onManage`. Punya panah geser kiri/kanan saat chip melebihi lebar (`.lf-scroll`). **Jangan** panggil `requestAnimationFrame` tanpa cek `typeof … !== 'undefined'` (SSR tidak punya) — pernah bikin halaman `/users` 500.
- **`LabelManagerModal`** (organism) — CRUD label (tambah/ubah/hapus), pilih warna via `ColorSelect`, dan tombol mata untuk **tampil/sembunyi** label (`visible`). Dipakai halaman `/users`.
- **`ColorSelect`** (molecule) — dropdown palet warna label (swatch, bukan teks). Wajib dipakai untuk semua pemilihan warna label.
- **`BackupRestore`** (organism) — panel ekspor/impor DB terenkripsi di `/worker/settings`. Owner-only + konfirmasi password owner.
- **Label pada akun member**: tabel `labels` + `user_labels` (banyak-ke-banyak). Tampil sebagai chip di baris user, di-assign per user via tombol `sell` di quick-actions. Filter label memakai param `?label=<id>`.
- **Storage per member**: `users.storageBytes` = `SUM(raw_size)` email aktif, tampil di baris identitas user (`formatBytes`).
- **`AppSidebar`** / **`AppTopbar`** — layout halaman admin.
- **Stores**: `toast.store` (`toastStore.success/error`), `confirm.store` (`confirmDialog({title,message,confirmLabel,danger})` → Promise<boolean>), `ui.store` (tema admin + `sidebarCollapsed`).

### Props/event konvensi
- Endpoint daftar pakai param `?status=`, `?q=`, `?sort=`, `?page=`.
- `view: 'inbox'|'starred'|'trash'` untuk mailbox; `trashView` boolean untuk panel user.
- Event lintas komponen: `usercreated`, `userchanged`.

---

## 9. Design System Gmail (referensi visual)

Program meniru **Gmail web** (desktop & mobile). Aturan yang mengikat:

- **Top bar** putih ~64px: hamburger → logo, search pill (`border-radius:24px`), kanan avatar + menu (email + Keluar). Sticky.
- **Sidebar** ~240–256px; item aktif pil biru muda; collapse jadi ikon saja (desktop) / drawer + scrim (mobile, 280px, easing ~180ms, auto-close saat pilih menu).
- **Daftar email**: baris = checkbox → bintang → pengirim → subjek (bold bila belum dibaca) + snippet abu → waktu. Belum dibaca = **bold** (bukan ganti warna latar); baris terpilih/hover = biru sangat muda `#eef4fd`. Container kartu putih radius ~16px, margin ~16px.
- **Detail email**: toolbar ikon (kembali/sampah/pulihkan, tandai belum dibaca, bintang) — bukan tombol besar; subjek besar ringan; baris pengirim (avatar, nama, `kepada ...`, tanggal); body HTML di **iframe aman** (`EmailBodyViewer`, `sandbox="allow-same-origin"`).
- **Bintang**: SVG custom. Off = outline abu (`--gm-star-off`, hover `--gm-star-hover`); On = fill + border biru (`--gm-blue` = `#1a73e8`). Email berbintang tetap ada di Kotak Masuk **dan** Berbintang.
- **Tema**: token `--gm-*` di `app.css` (light + `[data-theme='dark']`). Admin punya toggle terang/gelap (`theme_admin`); **member selalu terang**. Anti-FOUC di `app.html`.
- **Tidak ada** (sengaja): arsip (action/tab/`archivedCount`), compose/kirim/balas, unduh `.eml`, filter/tune, help/settings, mode gelap member.
- **Jebakan kelas global**: `app.css` punya `.layout-shell .main { min-height:100dvh }`. **Jangan** pakai kelas `main` di dalam komponen Gmail (dipakai `.main` di halaman admin justru untuk layout). GmailInbox dulu pakai `.main`, sekarang pakai `MailRow` tanpa `.main`.
- **Jangan buat daftar email baru** di halaman lain — pakai `GmailInbox`/`MailRow`.

---

## 10. Standar Penamaan (WAJIB)

### Bahasa
- Teks UI → **Indonesia** (kecuali istilah teknis: owner, member, email, password).
- Kode → **Inggris**.
- Satu hal = satu sebutan (UI/API/docs).

### Kosakata state
| Konsep | Sebutan resmi | Jangan |
| --- | --- | --- |
| Email baru | `Belum Dibaca` / `is_read=0` | unread (UI) |
| Email penting | `Berbintang` / `is_starred` | starred (UI) |
| Email dipindah ke Sampah | `Sampah` / `deleted_at` | Trash, hapus lunak |
| Email dipulihkan | `Pulihkan` / `untrash` | restore (UI) |
| Hapus permanen email | `Hapus Permanen` | delete forever (UI) |
| User dipindah ke Sampah | `Pindahkan ke Sampah` | Hapus, Nonaktifkan |
| User dipulihkan | `Pulihkan` | restore (UI) |
| Hapus permanen user | `Hapus Permanen` | purge (UI) |
| Akun utama | `owner` | admin (peran) |
| Akun biasa | `member` | user biasa |
| User aktif | `Aktif` | active (UI) |
| User di Sampah | `Sampah` (status `disabled`) | dihapus (UI) |
| Tag akun member | `Label` | tag, kategori, group |
| Warna label | `primary`/`success`/`warning`/`danger`/`neutral` | hex langsung |
| Label tampil/sembunyi | `visible` (kolom `labels.visible`) | show/hide (UI) |
| Backup data | `Backup` / `Restore` | dump, export (UI) |

### Label tombol (persis)
`Pindahkan ke Sampah` (kata `Hapus` hanya untuk permanen) · `Hapus Permanen` (hanya di view Sampah) · `Kosongkan Sampah` · `Pulihkan` · `Reset Password` · `Tambah User` · `Buat Massal` · `Edit` · `Cari` · `Batal` · `Selesai` · `Kirim` · `Salin`.
Pesan: `...berhasil dibuat`, `...dihapus`, `...dipulihkan`, `Gagal <aksi>.`, `Gagal menghubungi server. Coba lagi.`

### Konfirmasi & proteksi
- Semua aksi destruktif **WAJIB** `confirmDialog(...)` (komponen, bukan `window.confirm`), pesan = apa yang terjadi + "Tindakan ini tidak bisa dibatalkan." bila permanen.
- Owner selalu dilindungi; pesan: `Akun owner tidak bisa dihapus.`.
- User di Sampah tidak bisa login; user aktif tidak bisa dihapus permanen langsung (harus ke Sampah dulu).

---

## 11. Cloudflare Free Tier — WAJIB efisien

- **D1**: dilarang N+1 (`db.ts` di dalam loop render). Pakai `IN(...)` batch / window function. Setiap list `LIMIT` + pagination server-side. Query sering → tambahkan `CREATE INDEX IF NOT EXISTS`. Housekeeping throttle 10 menit + `try/catch`. Batch write dipecah. `schema.sql` idempotent.
- **Workers CPU/wall-clock**: PBKDF2 mahal → bulk maks 100, notify Telegram maks 10, jangan hash berulang. Hindari regex pathologis di worker.
- **Request**: minimalkan fetch antar worker (pakai `MAILFLARE_NOTIFY_URL`); Turnstile hanya saat perlu; session 1 query.
- **Aset**: jangan tambah library besar; `npm run check` harus 0 error sebelum deploy.

---

## 12. Komponen & kode — WAJIB reusable

- Cari dulu di `src/lib/components/{atoms,molecules,organisms}` + daftar Penamaan sebelum bikin komponen baru. Satu fitur = satu komponen.
- Halaman baru WAJIB pakai shell/organisme yang ada.
- Logic data bersama → `services/*` + `db.ts`, bukan query mentah di route.
- Satu source of truth untuk enum (`status`, `view`, `mode`).

---

## 13. Aturan tambahan (WAJIB)

1. **Secrets**: jangan commit token/password/`.dev.vars`/`wrangler.toml`. Bila token bocor (chat/log) → **rotate**.
2. **Keamanan**: endpoint non-publik cek `locals.authenticated` + `sessionRole`; state-changing wajib CSRF check global; header destruktif via `x-mailflare-confirm`; owner dilindungi.
3. **Retensi**: Sampah email & user 30 hari → hapus permanen. Restore user memberi password baru + cabut sesi. Reset password cabut semua sesi.
4. **UX**: destructive = `confirmDialog` + pesan jelas; error UI Indonesia; jangan bocorkan detail teknis (`D1_ERROR`, stack).
5. **Aksesibilitas & mobile**: tombol ikon punya `aria-label`+`title`; modal jadi bottom-sheet di mobile; elemen interaktif pakai `<button>`/`<a>` (hindari `on:click` di `<span>` tanpa role).
6. **Performa UI**: pagination (`Pager`), bukan render semua.
7. **Deploy**: `npm run check` (0 error) → `npm run deploy`; catat `Current Version ID`.
8. **Dokumentasi**: istilah/komponen/endpoint baru → tambahkan ke `agent.md` + `progres.md`.
9. **Rate limiting**: login/access-code wajib rate limit; aksi sensitif dibatasi per sesi/IP.
10. **Backup sebelum migrasi destruktif**: ekspor D1 (`wrangler d1 export`) dulu.
11. **Privasi email**: isi email (`raw_mime`,`body_text`,`body_html`) penuh hanya pemilik + owner (admin BOLEH lihat lewat `/users/:id/inbox`). DILARANG menulis isi email ke log/analytics/notifikasi/error; Telegram hanya metadata. `raw_mime` ikut retensi 30 hari.

---

## 14. Deployment (nilai nyata proyek ini)

| Item | Nilai |
| --- | --- |
| Worker name | `mailflare-web` |
| Cloudflare account | `31455a624e098cd795bcf8564615d87d` (Tiyunghujau@gmail.com) |
| D1 name / id | `mailflarecloud-db` / `392d99b7-0abb-4230-a0a9-4bb1efbf585d` |
| APP domain | `mail.karpetlampung.eu.org` |
| MAIL domain | `karpetlampung.eu.org` |
| Bindings | `DB` (D1), `ASSETS`; vars `MAILFLARE_USER_DOMAIN`, `MAILFLARE_NOTIFY_URL`; secrets `SETUP_TOKEN`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| Telegram | **belum dikonfigurasi** (tidak ada binding/env; `worker_settings` kosong) |

`wrangler.toml` & `.dev.vars` **gitignored** (berisi id/secret). Salin dari `wrangler.toml.example` / `.dev.vars.example` lalu isi.

Langkah deploy:
```bash
npm install
npm run check          # 0 error
npm run build
npx wrangler deploy
```
Bootstrap admin pertama: buka `/auth/login`, isi email+password, isi `SETUP_TOKEN`.
Email Routing: MX → `route1/2/3.mx.cloudflare.net`; catch-all `*@MAIL_DOMAIN` → **Send to a Worker** → `mailflare-web`.

> **PENTING (lingkungan sandbox/CLI)**: `wrangler` di environment ini butuh `NODE_OPTIONS=--dns-result-order=ipv4first`, jika tidak akan error "Unable to resolve Cloudflare's API hostname" (DNS memilih IPv6 lebih dulu). `curl -4` dan Node `fetch` normal. API D1 bisa diakses langsung via `POST https://api.cloudflare.com/client/v4/accounts/<acc>/d1/database/<id>/query`.

---

## 15. Jebakan teknis yang sudah terverifikasi

- **Member "Kosongkan Sampah" pernah 403**: `/api/me/trash/empty` tidak ada di allowlist member `hooks.server.ts`. Sudah diperbaiki — pastikan endpoint member baru ikut didaftarkan.
- **`confirm()` native** pernah dipakai di `UserListPanel.svelte` (`handleBulkSoftDelete`) → sudah diganti `confirmDialog`. Jangan pakai `confirm()` native.
- **Teks Inggris `copied.`** di `copyValue()` → sudah `disalin.`.
- **`/users/emails` page bisa kosong** bila `?page=` melebihi max → sudah di-clamp (`safePage`).
- **Sub-route `/api/worker-settings/*`** (connect-webhook, test-telegram) hanya cek `authenticated`; sudah ditambah cek owner.
- **`MailRow` desain**: aksi/checkbox bintang di dalam slot; `on:click` sengaja **tidak** dipasang di wrapper `<span>` (mencegah a11y warning). Jangan menambahkan `on:click` ke wrapper tanpa role.
- **`GmailShell` menu akun**: klik di luar menutup via `<button class="menu-scrim">` (bukan root-level click handler). `z-index` menu-scrim (19) < topbar (20) agar menu bisa diklik; menu (30).
- **Fallback demo data** di `db.ts` muncul bila `db` undefined (mis. `npm run dev` tanpa D1). Gunakan `npm run cf:dev` untuk D1 nyata.
- **`npm run build` pada Windows** menjalankan `prebuild` (bersihkan cache). Di Linux aman.
- **`npm install` gagal** bila `package-lock.json` memuat URL `.tgz` non-`registry.npmjs.org` (mirror Tencent pernah muncul) — pastikan semua `resolved` = `https://registry.npmjs.org`.
- **Verifikasi akses member**: `hooks.server.ts` akan `redirect` semua halaman non-`/me/*` milik member, sehingga cabang `inboxOnly` di halaman `/users/[userId]/*` praktis tidak pernah dirender untuk member. Jangan jadi bingung melihat dua cabang di file itu.
- **`Pager` tombol Next mati**: pernah terjadi karena `totalPages` default `1` dan halaman tidak mengirimnya. Sudah diperbaiki (auto-hitung dari `total`/`pageSize`). Bila membuat daftar berpaginasi baru, cukup kirim `page`/`total`/`pageSize`.
- **Edit User → Delete**: halaman `/users/[userId]/edit` memakai aksi kontekstual — user aktif di-`Pindahkan ke Sampah` (`soft-delete-user`), user di Sampah di-`Hapus Permanen` (`delete-user`). Jangan mengembalikannya ke permanent-delete untuk user aktif (akan selalu gagal dengan "User harus di Sampah dulu").
- **Audit admin live (2026-10-06)**: endpoint admin sensitif (`create/edit/resetPassword/softDelete/restore/permanentDelete/bulk`, email actions + bulk, worker-settings) sudah diuji end-to-end terhadap production dan berfungsi. CSRF menolak Origin asing (403). Public API v1 menolak tanpa key (401).
- **Bulk mode camelCase bug**: `toLowerCase()` vs `'softDelete'`/`'emptyTrash'` membuat bulk "Pindahkan ke Sampah" & "Kosongkan Sampah" selalu 400. Sudah diperbaiki; server pakai `softdelete`/`emptytrash`.
- **Logout kini terverifikasi** via `confirmDialog` di `GmailShell`, `AppSidebar`, `AppTopbar` (cegah salah pencet).
- **Logo seragam**: admin (`BrandLockup`) & member (`GmailShell`) memakai wordmark "M"+"Mailflare" berwarna **biru** (`--color-primary-500` di admin, `--gm-blue` di member), bukan gradient/Google colors.
- **Halaman Sampah user** tidak lagi punya bulk checklist; hanya tombol `Kosongkan Sampah`. Baris tidak lagi menampilkan checkbox (mencegah aksi tak sengaja).
- **Warna aksi hapus**: ikon `delete`/`delete_forever`/`person_remove` di seluruh UI memakai warna danger (`--gm-danger` / `--color-danger`), bukan abu.
- **Urutan side menu admin**: Dashboard → **User List** → Semua Email → Worker Settings.
- **Backup/Restore (sesi 5)**: `POST /api/backup/export` & `/restore` owner-only, wajib password owner (re-auth, bukan sekadar sesi) + passphrase enkripsi. Restore mode `replace` butuh header `x-mailflare-confirm: restore-replace`. Dump/restore tabel memakai `INSERT OR REPLACE` (aman idempoten). Tabel `login_sessions`/`access_*`/`telegram_webhook_updates` **sengaja tidak di-backup** (ephemeral). Batas file ±25MB untuk free tier; di atas itu pakai `wrangler d1 export`.
- **Passphrase backup tidak pernah dikirim/di-log**; enkripsi di server dengan AES-GCM-256 + PBKDF2-SHA256 100.000 iterasi. Jangan menurunkan batas `checkRateLimit` tanpa alasan.
- **Bulk restore modal**: `bulkMode='restore'` → judul modal hasil `bulkResultTitle` "Pulihkan User Massal" (bukan "Buat User Massal"). Selalu reset `bulkMode`/`bulkCredentials` saat modal ditutup agar state tidak bocor ke "Buat Massal".

---

## 16. Checklist sebelum commit

1. Istilah/label ada di daftar (atau tambahkan dulu di sini).
2. Komponen reusable dipakai, bukan buat baru.
3. `npm run check` = **0 error / 0 warning**.
4. `npm test` lulus.
5. Tidak ada teks UI berbahasa Inggris baru (kecuali komponen/role/field).
6. Tidak ada `confirm()` native; destruktif pakai `confirmDialog`.
7. Endpoint member baru sudah masuk allowlist `hooks.server.ts`.
8. `progres.md` diperbarui.