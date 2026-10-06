# 📬 Cloud Mail Flare

> Aplikasi web email pribadi yang berjalan 100% di atas infrastruktur Cloudflare — **gratis**, **cepat**, dan **aman**.

---

## 🧐 Apa itu Cloud Mail Flare?

**Cloud Mail Flare** adalah aplikasi manajemen email berbasis web yang Anda host sendiri (self-hosted) menggunakan layanan **Cloudflare** (gratis). Anda bisa membuat kotak masuk (inbox) email dengan domain sendiri, mengelola pengguna, dan menerima notifikasi email langsung ke **Telegram**.

Seluruh aplikasi berjalan sebagai satu **Cloudflare Worker** — tidak perlu server VPS, tidak perlu bayar hosting mahal.

---

## ✨ Fitur Utama

### Antarmuka (tampilan Gmail — desktop & mobile)
| Fitur | Keterangan |
| ----- | ---------- |
| 📨 Tampilan Gmail | Header (hamburger, logo, search pill, avatar), sidebar yang bisa di-collapse (desktop) atau jadi drawer + scrim (mobile) |
| 📬 Kotak Masuk / Berbintang / Sampah | Tiga menu utama untuk received-only mailbox; tab aktif tetap terlihat saat membuka email |
| ☑️ Bulk checklist | Pilih semua per halaman (indeterminate), tandai sudah/belum dibaca, hapus — semua lewat **1 request** (bulk `IN (...)`) |
| ⭐ Bintang | Bintang terisi biru; email berbintang **tetap ada di Kotak Masuk** dan juga muncul di Berbintang |
| 🗑️ Sampah | Banner "dihapus otomatis setelah 30 hari" + tombol **Kosongkan Sampah**, email bisa dipulihkan |
| 📄 Detail email | Toolbar Kembali/Sampah/Bintang, subjek besar, baris pengirim, body email selebar halaman dengan **satu scroll saja** |
| 🌗 Tema | Admin: terang/gelap (tersimpan terpisah, anti-FOUC). Member: selalu terang |
| 📱 Responsif | Drawer sidebar + baris email 2 baris di layar kecil |
| 🧭 Error & loading | Halaman 404/500 on-brand + progress bar navigasi + pagination 50 email/halaman |

### Fungsional
| Fitur | Keterangan |
| ----- | ---------- |
| 📥 Inbox Email | Menerima & membaca email masuk via Cloudflare Email Routing |
| 👤 Manajemen Pengguna | Admin membuat, mengedit, reset password, menghapus user |
| 🔐 Login Aman | Session cookie + Cloudflare Turnstile + rate limit + bootstrap owner lewat `SETUP_TOKEN` |
| 🤖 Notifikasi Telegram | Email masuk diteruskan ke Telegram (bisa per pengguna) + bot Telegram (perintah `/adduser`, `/inbox`, dll) |
| 🔑 Public API Key v1 | `create_user`, `list_user`, `user_mailbox`, `read_email` dengan prefix `cmf_v1_` |
| 🧹 Retensi Sampah | Email di Sampah > 30 hari dihapus permanen otomatis (lazy + throttle 10 menit, **tanpa cron**) |
| 🛡️ Keamanan Password | Hash PBKDF2-SHA256, CSP/HSTS/CSRF check, audit log tiap aksi email |

### Yang **tidak** ada (sengaja dihapus)
- ❌ **Arsip** (aksi archive, tab Archived, query archivedCount)
- ❌ Compose / kirim / balas email (aplikasi ini **receive-only**)
- ❌ Unduh `.eml`, tombol filter (tune), help, settings, apps, titik-3 di UI inbox
- ❌ Mode gelap untuk halaman member

---

## 🏗️ Teknologi yang Digunakan

Tidak perlu memahami semuanya sekarang, tapi ini adalah teknologi di balik layar:

- **[SvelteKit](https://kit.svelte.dev/)** — Framework frontend + backend (seperti Next.js, tapi lebih ringan)
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — Tempat aplikasi dijalankan (serverless)
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** — Database SQL gratis dari Cloudflare
- **[Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)** — Penerusan email masuk ke Worker
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** — CLI resmi Cloudflare untuk development & deploy
- **[npm](https://www.npmjs.com/)** — Package manager Node.js (bawaan Node.js)

---

## 📋 Persiapan & Instalasi di Cloudflare

> Bagian ini berisi urutan yang **sudah terbukti berhasil** (berdasarkan instalasi nyata), termasuk jebakan yang sering terjadi.

### 1. Yang perlu disiapkan

- **Node.js 20+** (`node -v`), npm, Git
- **Akun Cloudflare** + **domain yang sudah di-Cloudflare** (wajib untuk Email Routing & custom domain)
- **Keputusan nama**: `APP_DOMAIN` (mis. `mail.example.com`) dan `MAIL_DOMAIN` (mis. `example.com`)
- **`SETUP_TOKEN`** untuk bootstrap admin pertama (buat random: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### 2. Clone & install

```bash
git clone https://github.com/Artupasigoy/mailflare.git
cd mailflare
npm install
```

### 3. API Token Cloudflare (WAJIB dibuat)

Buat **Custom Token** di https://dash.cloudflare.com/profile/api-tokens dengan permission:

| Scope | Permission |
| ----- | ---------- |
| Account | **D1 → Edit** |
| Account | **Workers Scripts → Edit** |
| Zone | **Zone → Read** |
| Zone | **DNS → Edit** |
| Zone | **Email Routing Rules → Edit** |
| Zone | **Workers Routes → Edit** (dibutuhkan agar custom domain bisa di-deploy) |

> ⚠️ Token hanya bisa membuat subdomain `workers.dev` lewat **Global API Key**, bukan API token — proyek ini **tidak** memakai cron, jadi tidak perlu subdomain tersebut.

Export token lalu login wrangler:

```bash
export CLOUDFLARE_API_TOKEN=<token>   # atau pakai npx wrangler login
npx wrangler whoami
```

### 4. Database D1

```bash
npx wrangler d1 create mailflarecloud-db          # salin database_id
npx wrangler d1 execute mailflarecloud-db --remote --file ./schema.sql
```

### 5. Konfigurasi `wrangler.toml`

Salin dari `wrangler.toml.example` (`wrangler.toml` tidak di-commit karena berisi `database_id`) lalu isi:

```toml
name = "mailflare-web"
main = ".svelte-kit/cloudflare/_worker.js"
compatibility_date = "2026-04-07"
compatibility_flags = ["nodejs_compat"]
workers_dev = false

[[routes]]
pattern = "mail.EXAMPLE.COM"     # APP_DOMAIN
custom_domain = true

[assets]
directory = ".svelte-kit/cloudflare"
binding = "ASSETS"

[vars]
MAILFLARE_USER_DOMAIN = "example.com"            # MAIL_DOMAIN
MAILFLARE_NOTIFY_URL = "https://mail.EXAMPLE.COM"

[[d1_databases]]
binding = "DB"                                   # WAJIB: DB
database_name = "mailflarecloud-db"
database_id = "<dari langkah 4>"
```

> ⚠️ **Jangan** menambahkan `[triggers] crons` jika akun belum punya subdomain `workers.dev` — deploy akan gagal sebagian dengan error `10063`.

### 6. Secrets (wajib)

```bash
npx wrangler secret put SETUP_TOKEN
npx wrangler secret put TURNSTILE_SITE_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

Buat Turnstile di dashboard → **Turnstile → Add widget**, hostname **harus persis sama** dengan `APP_DOMAIN` (jika tidak cocok, widget tidak muncul dan tombol login tidak bisa ditekan).

### 7. Validasi & deploy

```bash
npm run check
npm run build
npm run deploy
```

### 8. Bootstrap admin pertama

Buka `https://APP_DOMAIN/auth/login`, isi email + password admin, lalu isi **Setup Token** dengan nilai `SETUP_TOKEN`.

### 9. Email Routing (penting!)

1. Dashboard → **Email → Email Routing → Enable**
2. Pastikan record MX Cloudflare (`route1/2/3.mx.cloudflare.net`) sudah dibuat
3. **Hapus MX lama** bila masih ada (mis. MX yang mengarah ke mail server sendiri) — email tidak akan masuk ke Cloudflare selama MX bentrok masih ada
4. **Routing rules → Catch-all** `*@MAIL_DOMAIN` → Destination **Send to a Worker** → pilih worker (`mailflare-web`)
5. Verifikasi: `curl https://APP_DOMAIN/api/health`, lalu kirim email percobaan ke `user@MAIL_DOMAIN`

---

## 🔑 Peran Pengguna (Roles)

| Role             | Akses                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Admin**  | Semua halaman: Dashboard, Users, Worker Settings, Inbox semua user |
| **Member** | Hanya inbox milik sendiri (`/me/inbox`)                          |

---

## 📡 Daftar API Endpoint

| Method     | Path                     | Keterangan                        |
| ---------- | ------------------------ | --------------------------------- |
| `GET`    | `/api/health`          | Cek status aplikasi               |
| `POST`   | `/api/auth/login`      | Login pengguna                    |
| `GET`    | `/api/auth/logout`     | Logout pengguna                   |
| `GET`    | `/api/me`              | Info akun yang sedang login       |
| `GET`    | `/api/me/inbox`        | Inbox milik sendiri               |
| `GET`    | `/api/me/emails/:id`   | Detail email milik sendiri        |
| `PATCH`  | `/api/me/emails/:id`   | Aksi email: `star`, `delete`, `untrash`, `read`, `unread` |
| `POST`   | `/api/me/emails/bulk`  | Bulk aksi: `{ ids, action: 'delete' \| 'read' \| 'unread' }` (1 query) |
| `POST`   | `/api/me/trash/empty`  | Kosongkan Sampah milik sendiri    |
| `GET`    | `/api/users`           | Daftar semua pengguna (Admin)     |
| `POST`   | `/api/users`           | Buat pengguna baru (Admin)        |
| `GET`    | `/api/users/:id`       | Detail pengguna (Admin)           |
| `PATCH`  | `/api/users/:id`       | Update pengguna — termasuk toggle `telegramEnabled` (Admin) |
| `DELETE` | `/api/users/:id`       | Hapus pengguna (Admin)            |
| `GET`    | `/api/users/:id/inbox` | Inbox pengguna tertentu (Admin)   |
| `PATCH`  | `/api/users/:id/emails/:emailId` | Aksi email user tertentu (Admin/pemilik) |
| `POST`   | `/api/users/:id/emails/bulk` | Bulk aksi (Admin/pemilik)   |
| `POST`   | `/api/users/:id/trash/empty` | Kosongkan Sampah user tersebut |
| `GET`    | `/api/dashboard`       | Data dashboard (Admin)            |
| `GET`    | `/api/worker-settings` | Baca konfigurasi worker (Admin)   |
| `PATCH`  | `/api/worker-settings` | Update konfigurasi worker (Admin) |
| `GET`    | `/api/worker-settings/api-key` | Status API key aktif (Admin) |
| `POST`   | `/api/worker-settings/api-key/generate` | Generate API key baru (Admin) |
| `POST`   | `/api/worker-settings/api-key/regenerate` | Rotate/regenerate API key (Admin) |
| `POST`   | `/api/public/v1/create_user` | Public API: create user (API key) |
| `GET`    | `/api/public/v1/list_user` | Public API: list user (API key) |
| `GET`    | `/api/public/v1/user_mailbox` | Public API: inbox by username (API key) |
| `GET`    | `/api/public/v1/read_email` | Public API: read email rendered text (API key) |

> Catatan: endpoint `read_emai` (tanpa `l`) **tidak ada** di versi ini — gunakan `read_email`.

---

## 📜 NPM Scripts — Perintah yang Tersedia

| Perintah                         | Fungsi                                                         |
| -------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                  | Jalankan Vite dev server biasa (tanpa D1)                      |
| `npm run cf:dev`               | Jalankan Worker dev mode**dengan D1** (direkomendasikan) |
| `npm run check`                | Cek error TypeScript / Svelte                                  |
| `npm run build`                | Build aplikasi untuk production                                |
| `npm run deploy`               | Build + upload ke Cloudflare                                   |
| `npm run smoke:api-key:v1`     | Smoke test otomatis API key + public API v1 (lokal)           |
| `npm run telegram:webhook:set`    | Daftarkan webhook Telegram                                     |
| `npm run telegram:webhook:delete` | Hapus webhook Telegram                                         |
| `npm run telegram:webhook:info`   | Cek info webhook Telegram                                      |

---

## 🗂️ Struktur Folder Project

```
cloud-mail-flare/
├── src/
│   ├── lib/
│   │   ├── components/       # Komponen UI (Atomic Design)
│   │   │   ├── atoms/        # Elemen dasar (tombol, input, dll)
│   │   │   ├── molecules/    # Gabungan atom (form, kartu, dll)
│   │   │   └── organisms/    # Bagian halaman (navbar, sidebar)
│   │   ├── server/
│   │   │   ├── db.ts         # Akses database terpusat
│   │   │   └── services/     # Logika bisnis backend
│   │   └── types/            # Definisi tipe TypeScript
│   └── routes/
│       ├── api/              # Semua endpoint API
│       ├── auth/             # Halaman login/logout
│       ├── dashboard/        # Halaman admin dashboard
│       ├── me/               # Halaman inbox member
│       ├── users/            # Halaman manajemen user (admin)
│       └── worker/           # Halaman worker settings (admin)
│   ├── lib/components/organisms/  # GmailShell, GmailInbox, GmailEmail, GmailTabs
├── agent.md                  # Catatan referensi desain UI (WAJIB dibaca sebelum ubah UI)
├── docs/                     # Dokumentasi tambahan
├── scripts/                  # Script build & Telegram
├── schema.sql                # Schema database (source of truth)
├── wrangler.toml             # Konfigurasi Cloudflare Worker
├── .dev.vars                 # Environment variables lokal (jangan di-commit!)
└── package.json
```

---

## ❓ Pertanyaan Umum (FAQ)

**Q: Apakah ini benar-benar gratis?**

> Ya! Cloudflare Workers, D1, dan Email Routing memiliki tier gratis yang lebih dari cukup untuk penggunaan pribadi.

**Q: Apakah saya perlu VPS atau server?**

> Tidak. Semua berjalan sebagai Cloudflare Worker — tidak ada server yang perlu dikelola.

**Q: Bagaimana jika saya lupa Setup Token?**

> Lihat kembali nilai `SETUP_TOKEN` di file `.dev.vars` (lokal) atau secrets Cloudflare (production).

**Q: Bisa pakai lebih dari satu domain email?**

> Saat ini satu domain email utama, diatur lewat env `MAILFLARE_USER_DOMAIN` di `wrangler.toml`.

**Q: Apakah ada cron untuk menghapus Sampah?**

> Tidak. Penghapusan email Sampah > 30 hari berjalan *lazy*: dipanggil dari layout utama (halaman member & admin) dan saat membuka Sampah, dengan throttle 1x per 10 menit per isolate. Jadi tidak butuh subdomain `workers.dev`.

**Q: Kenapa baris email di halaman admin dulu terlihat sangat tinggi?**

> Ada aturan global `.layout-shell .main { min-height: 100dvh }` di `src/app.css` yang menimpa elemen ber-class `main` milik komponen. Di dalam komponen Gmail **dilarang** memakai nama kelas `main` (GmailInbox memakai `.row-link`).

**Q: Kenapa email tidak masuk ke aplikasi?**

> 90% karena MX record: pastikan MX mengarah ke `route1/2/3.mx.cloudflare.net` (bukan ke mail server lain) dan catch-all sudah disetel *Send to a Worker*.

**Q: Kenapa halaman login tidak bisa submit?**

> Widget Turnstile gagal dimuat karena hostname widget tidak sama persis dengan domain yang diakses. Samakan hostname, lalu refresh.

**Q: Apa bedanya `npm run dev` dan `npm run cf:dev`?**

> `npm run dev` menjalankan Vite biasa (cepat tapi tidak bisa akses database D1). `npm run cf:dev` mensimulasikan lingkungan Cloudflare secara penuh termasuk D1 — gunakan ini untuk development sehari-hari.

**Q: Bagaimana cara menonaktifkan notifikasi Telegram untuk pengguna tertentu?**

> Buka halaman **Users → Edit User**. Pada form edit, hilangkan centang pada opsi **"Forward incoming emails to Telegram"** lalu klik **Save Changes**. Email masuk untuk pengguna tersebut tidak akan lagi diteruskan ke Telegram. Centang kembali untuk mengaktifkan ulang.

---

## 📚 Dokumentasi Tambahan

| Dokumen                                                              | Isi                                      |
| -------------------------------------------------------------------- | ---------------------------------------- |
| [deploy-fullstack-cloudflare.md](./docs/deploy-fullstack-cloudflare.md) | Panduan deployment lengkap ke production |
| [integrasi-telegram-bot.md](./docs/integrasi-telegram-bot.md)           | Setup bot Telegram secara detail         |
| [member-inbox-only.md](./docs/member-inbox-only.md)                     | Penjelasan mode Member / inbox-only      |
| [api-key-public-api.md](./docs/api-key-public-api.md)                   | Spesifikasi + UAT terpadu API key & public API v1 |

---

## ⚠️ Catatan Penting

- File `.dev.vars` **jangan pernah di-push ke GitHub** (sudah ada di `.gitignore`).
- Saat build di **Windows**, project otomatis menjalankan script `prebuild` untuk membersihkan cache agar tidak error.
- Hapus pengguna hanya bisa dilakukan jika tidak ada data email atau sesi login yang masih terhubung.
- `schema.sql` adalah sumber kebenaran (source of truth) untuk struktur database — jangan diubah sembarangan.
- **Jangan pernah commit** `wrangler.toml`, `.dev.vars`, API token, atau kunci Turnstile — semuanya sudah diabaikan `.gitignore`.
- Sebelum mengubah tampilan, baca **[agent.md](./agent.md)** agar tetap konsisten dengan gaya Gmail & token warna `--gm-*`.
- Komponen UI Gmail (`GmailShell`, `GmailInbox`, `GmailEmail`, `GmailTabs`) **reusable** — jangan membuat daftar email baru di halaman lain.
- Aplikasi ini **receive-only**: tidak ada compose/kirim/reply, dan fitur arsip sengaja tidak ada.
