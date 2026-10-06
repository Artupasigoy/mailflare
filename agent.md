# AGENT NOTES — Gmail Web UI (referensi desain)

> **WAJIB**: Sebelum menambah/mengubah fitur apa pun, baca seluruh aturan di `agent.md` — terutama bagian **"Standar Penamaan (WAJIB)"**, **"Cloudflare Free Tier — WAJIB efisien"**, dan **"Komponen & kode — WAJIB reusable"**. Setiap nama halaman, istilah, komponen, tombol, label, kelas CSS, event, dan endpoint HARUS memakai nama yang sudah ada di daftar tersebut. Dilarang membuat istilah/komponen baru bila padanan sudah ada.


Program ini meniru tampilan **Gmail web (desktop & mobile)**. Berikut temuan/ketentuan desain yang harus dipatuhi agar UX-nya "1:1 Gmail".

## Struktur halaman utama (desktop)
- **Top bar (putih, tipis, tinggi ~64px)**: logo "Gmail" di kiri, **search bar** besar rounded pill (background `#eaf1fb`, ikon search + teks 'Cari email...'), di kanan ada ikon Apps (titik 9), lalu **ikon avatar user** yang bisa di-klik untuk menu logout, notifikasi.
- **Sidebar kiri (putih/biru-abu `#f6f8fc`, ~240px)**: menu utama — **Kotak Masuk**, **Berbintang**, **Draf**, **Terkirim**, **Sampah**, **Lainnya...**. Item aktif berwarna `#d3e3fd` (biru muda) dan teks bold. Khusus halaman yang dipakai di sini hanya: **Kotak Masuk, Berbintang, Sampah**.
- **Area konten**: daftar email per baris. Tidak ada kartu/grid; baris dipisah border tipis.

## Top bar detail
- Tinggi konsisten di kedua halaman (inbox & detail).
- Search selalu terlihat, placeholder "Cari email...", submit mengarahkan ke `/me/inbox?q=...`.
- Di kanan avatar: menu kecil berisi **email user** dan tombol **Keluar / Logout**.
- Top bar **menempel di atas** (sticky) dan tidak bergeser antara inbox dan detail.

## Sidebar
- Lebar ~240px, item: Kotak Masuk / Berbintang / Sampah.
- Item aktif menyorot biru muda, ikon sejajar kiri, label di kanan.
- Di mobile sidebar berubah jadi **bar horizontal** (chips) di bawah top bar.

## Halaman daftar email (Inbox)
- **Baris daftar** (satu baris per email):
  - ikon bintang (toggle) di kiri;
  - pengirim (nama) kolom lebar ~170px;
  - subjek (tebal bila belum dibaca) + snippet (abu-abu, sesudah "– ") pada kolom tengah;
  - waktu di kanan (jam bila hari ini, tgl singkat bila beda hari).
- Email **belum dibaca**: background **putih**, pengirim & subjek & waktu **bold**.
- Email **sudah dibaca**: background `#f2f6fc` (abu-biru sangat muda), teks normal.
- Hover: border halus + bayangan tipis.
- Baris Sampah: ada tombol **Pulihkan**.
- Di bawah daftar: pagination sederhana.

## Halaman detail email
- Header Gmail: toolbar dengan ikon (kembali, arsip, sampah, bintang) di kiri, bukan tombol "Back to Inbox" besar.
- Subjek besar di atas.
- Baris pengirim: avatar lingkaran berinisial, nama/alamat pengirim, "untuk {penerima}", tanggal di kanan.
- Body email di bawahnya.
- Lampiran ditampilkan sebagai chip.

## Mobile
- Sidebar menjadi **tab horizontal** di bawah search.
- Baris email: satu baris, pengirim bold atas, subjek + snippet di tengah, waktu di kanan.

## Warna / gaya
- Background putih, border abu tipis `#e8eaed`.
- Biru aksen `#1a73e8`, abu teks sekunder `#5f6368`.
- Font Arial/sans-serif.
- Tidak memakai tombol tebal/penuh; aksi sekecil mungkin ikon ber-tooltip.

## Detail implementasi UI Gmail web (lebih persis)
### Hamburger (garis 3) & sidebar
- Di pojok kiri top bar ada ikon **hamburger** (tiga garis horizontal). Klik berfungsi **membuka/menutup sidebar**.
- Saat sidebar **terbuka** (default): lebar ~240–256px, item ada ikon + label.
- Saat sidebar **tertutup**: ikon saja (lebar ~72px), label hilang, item jadi bulat tinggi; hover menampilkan tooltip label.
- Background sidebar: putih/abu sangat muda (`#f6f8fc`/`#fff`), item hover abu muda `#f1f3f4`, item aktif biru muda `#d3e3fd` melengkung di kanan (`border-radius: 0 1.5rem 1.5rem 0`).

### Posisi logo & search & profile di top bar
- Top bar membentang penuh di atas, tinggi ~64px, background putih, ada bayangan halus / border bawah.
- **Kiri**: sebagai tombol hamburger → logo teks "Gmail" (gambar) sederajat.
- **Tengah (fleksibel, biasanya mulai di sebelah logo)**: **search bar** rounded pill (`border-radius: 24px`), background `#eaf1fb`, ikon search di kiri dalam kotak, placeholder "Cari email...", max-width ~720px. Saat fokus menjadi putih dengan bayangan.
- **Kanan**: ikon help (tanda tanya), ikon pengaturan (roda gigi), ikon apps (9 titik), lalu **lingkaran avatar profil** (huruf pertama dari email, background biru/ungu bergradien). Klik avatar memunculkan menu kecil berisi nama/email, tombol "Kelola akun Anda", dan "Logout / Keluar".

### Margin / pemisahan area
- Top bar selalu **penuh lebar** dan menempel di atas.
- Di bawahnya ada **sidebar kiri** dan **area isi**; keduanya non-overlap.
- Area isi konten (daftar/detail) mendapat **margin kiri ~16px** dari sidebar dan memberi padding seperti Gmail.
- Saat sidebar tertutup (mini), area isi melebar ke kiri dengan margin tetap 16px dari sidebar mini.
- Container daftar email memakai kartu putih dengan sudut melengkung `~12px`, border halus, dan toolbar (pilih semua, refresh, jumlah halaman) di atasnya.

### Perbedaan background top bar vs daftar/detail
- Top bar: putih, tanpa card, border bawah tipis.
- Sidebar: `#f6f8fc`/putih.
- Isi (daftar inbox & detail email): latar putih; daftar dibungkus container kartu dengan border `#e8eaed` dan sudut melengkung. Email belum dibaca: putih bold; email sudah dibaca: `#f2f6fc`.

- Bintang (custom SVG): tidak berbintang = **outline abu** (`--gm-star-off`, hover `--gm-star-hover`); berbintang = **border + fill biru** (`--gm-blue` = `#1a73e8`). Diganti dari ikon material ke SVG agar fill penuh.

### Baris email & hover
- Baris dibaca: bg `#f2f6fc`; baris belum dibaca: bg putih, font bold.
- Hover: efek bayangan halus (inset border + shadow 1px) tanpa mengubah warna drastis.
- Terpilih/dibuka tetap putih dengan sender/subject solid.

### Detail email
- Toolbar ikon seragam Gmail (kembali, arsip, hapus, bintang) di atas, bukan tombol besar.
- Subjek besar tapi ringan, lalu meta pengirim (avatar, pengirim, "untuk", tanggal), lalu body dalam kartu putih. Body HTML email di-render dalam frame aman.

## Detail visual dari screenshot Gmail (referensi utama)
Sumber: `/home/agentuser/contoh/*.png` (Gmail web desktop, tampilan baru).

### Top bar (desktop)
- Tinggi ~64px, **background putih**, tanpa border tebal.
- **Kiri**: ikon hamburger (tiga garis, tanpa latar) → logo (huruf "M" multicolour + teks "Gmail" warna gelap, font besar ~22px).
- **Tengah-kiri**: search pill lebar, `border-radius: 24px`, background abu-lavender `#eef1f6`, tinggi ~48px. Isi: ikon search (kiri), placeholder "Telusuri email", dan di **kanan dalam pill** ada ikon **tune/slidSettings** dengan latar abu bulat (untuk opsi filter).
- **Kanan (urutan)**: ikon kotak biru (assistant), tombol help "?", ikon roda gigi, tombol pill "Upgrade", ikon Gemini, ikon **apps 3x3 titik**, lalu **avatar lingkaran** paling kanan.
- Tidak ada garis pemisah tegas; area konten di bawah punya kartu sendiri.

### Sidebar
- **Background putih** (bukan abu), tanpa border kanan.
- Tombol "Tulis" (Compose) di atas — **tidak dipakai di app ini** (receive-only).
- Item menu: ikon kiri + label; di kanan **angka unread** (mis. "4.664") dengan format pemisah ribuan.
- **Item aktif** ("Kotak Masuk"): pil biru muda `#c2e7ff`, label **bold**, ikon biru tua; pil membulat penuh, padding selebar item.
- **Item tidak aktif**: ikon abu `#5f6368`, label gelap biasa.
- Bagian bawah: header "Label" + tombol `+`, lalu item label.

### Area daftar inbox
- Dibungkus **kartu putih** dengan `border-radius` besar (~16px) di sudut atas, border tipis, **margin ~16px** dari sidebar dan dari top bar.
- **Baris toolbar** di dalam kartu: kiri = checkbox "pilih semua" + caret, refresh, kebab (3 titik). Kanan = teks "1–50 dari 5.399", chevron kiri/kanan, ikon pensil + caret.
- **Baris tab kategori**: "Utama" (aktif, ada **garis bawah biru**), lalu tab lain dengan badge jumlah ("Promosi 13 baru" hijau, "Info Terbaru 26 baru" oranye). Di bawah nama tab ada preview snippet.
- **Baris email**: 
  - handle drag (titik-titik, muncul saat hover) → checkbox → ikon bintang outline → nama pengirim (bold bila belum dibaca) → subjek/snippet → waktu di kanan (bold bila belum dibaca).
  - **Semua baris background putih**; belum dibaca ditandai **tebal** (bukan warna latar).
  - Baris **terpilih/hover**: latar biru muda `#eef4fd` + border tipis.
  - Saat hover muncul ikon aksi cepat di kanan: arsip, sampah, tandai belum dibaca, snooze (jam).

### Halaman detail email
- **Toolbar di dalam area konten** (bukan tombol besar): kiri = panah kembali, arsip, spam, sampah, lalu garis pemisah, tandai belum dibaca, pindahkan, kebab. Kanan = "5 dari 5.398", chevron kiri/kanan, pensil + caret.
- **Subjek besar** (~28px, weight normal) di kiri; di kanan baris subjek ada ikon cetak & buka-di-jendela.
- **Baris pengirim**: avatar lingkaran abu (ikon orang), nama pengirim **bold** + alamat `<...>` abu, di bawah "kepada saya ▾"; di kanan: tanggal ("Sab, 3 Okt, 21.40"), ikon bintang, smiley, balas, kebab.
- **Body**: email berada di atas **background abu** `#f6f6f6`, dan konten email itu sendiri **kartu putih** yang dipusatkan (max-width ~600–700px) dengan border-radius.

### Koreksi penting
- Sidebar **putih**, top bar **putih**, kartu konten **putih** dengan margin 16px.
- Unread = **tebal**, background tetap putih (bukan abu). Abu hanya untuk baris terpilih/hover.

### Mobile (Gmail app)
- **Sidebar jadi drawer**: bukan bar horizontal. Tertutup secara default, muncul dari kiri (280px, sliding, easing ~180ms) saat hamburger ditekan, dengan **scrim gelap** (rgba(32,33,36,.4)) di atas konten. Konten di belakang tetap terlihat, tidak bergeser.
- Menutup drawer: tekan hamburger lagi, tap scrim, atau memilih salah satu menu (auto-close setelah navigasi).
- Drawer memakai gaya yang sama dengan desktop: item aktif pil biru `#c2e7ff`, hover `#f1f3f4`, tinggi item 40px (target sentuh lebih besar).
- **Baris email mobile**: 2 baris — baris 1 pengirim (tebal) + waktu di kanan; baris 2 subjek + snippet (abu, weight normal; email belum dibaca tetap bold). Checkbox & bintang membesar (20px) agar mudah ditekan.
- Toolbar daftar email menempel di bawah top bar saat scroll (`sticky top: 56px`).
- **Star (bintang)**: SVG custom. Tidak berbintang = outline abu `#bdc1c6` (hover `#80868b`); berbintang = **border + fill biru `#1a73e8`**. Berlaku di list & detail.
- Email berbintang **tetap ada di Kotak Masuk** dan juga muncul di **Berbintang** (tidak dipindah).
- **Logout** selalu berakhir di `/auth/login`: komponen pakai `fetch('/api/auth/logout')` + `invalidateAll()` + `goto('/auth/login')`; endpoint `GET /api/auth/logout` juga melakukan `redirect(303, '/auth/login')` bila diakses langsung.
- Ikon `tune` di dalam search pill, help, setelan, aplikasi, titik 3, unduh, buka tab baru, dan archive **sudah dihapus** — jangan ditambahkan kembali.
- Kartu daftar email dibulatkan hanya di bawah dan tanpa border samping (mengikuti layar penuh).

## Soft delete user (bisa restore + retensi 30 hari)
- Kolom `users.deleted_at`. Soft delete = `password_hash = NULL` + `deleted_at = NOW()` (**email & nama tetap disimpan** supaya bisa restore). Sesi login direvoke.
- Restore: `PATCH /api/users/:id { restore: true }` → user aktif lagi + **password baru** (dikembalikan agar admin bisa membagikannya). Bulk: `POST /api/users/bulk { mode:'restore', userIds:[] }`.
- Purge permanen: `purgeExpiredSoftDeletedUsersInDb()` menghapus user soft-deleted > 30 hari **beserta email & sesinya** (3 query, dijalankan lazy + throttle 10 menit, hanya saat request admin/owner).
- Hapus permanen langsung (tanpa retensi) tetap tersedia lewat bulk `mode:'delete'` — hanya untuk user tanpa email & tanpa sesi.

## Retensi Sampah (30 hari) — TIDAK pakai cron
- Cron **tidak dipakai** (butuh workers.dev subdomain). Purge berjalan **lazy + throttled**.
- `purgeExpiredTrashThrottled(event)` di `users.service.ts`: memanggil `purgeExpiredTrashInDb()` (DELETE semua email `deleted_at` > 30 hari, **semua user**) maksimal **1x per 10 menit per isolate**.
- Dipanggil dari `+layout.server.ts` → otomatis jalan di **semua halaman member & admin** (dashboard, users, inbox, dll). Dipanggil juga dari `getUserTrash()`.
- Biaya: 1 query DELETE yang biasanya tidak match (murah), bukan tiap request.
- `emptyTrashForUserInDb()` untuk tombol "Kosongkan Sampah" (`POST /api/me/trash/empty` & `/api/users/:userId/trash/empty`).
- Konstanta: `TRASH_RETENTION_DAYS = 30` di `db.ts`. Banner + tombol ada di `GmailInbox` (`trashEmptyUrl` prop).

## Tema: TERPISAH per role, default TERANG
- Hanya **Admin** (owner) yang punya preferensi tema gelap (`localStorage: theme_admin`). Halaman member selalu terang.
- **Default TERANG** (tidak ikut `prefers-color-scheme`). Anti-FOUC: script inline di `app.html` menerapkan tema **sebelum halaman digambar** (hanya bila scope terakhir = admin & `theme_admin` = dark), `+layout.svelte` mengoreksi sesuai `sessionRole`.
- Store: `adminDarkMode`, `memberDarkMode`, `toggleTheme('admin'|'member')`, `applyTheme()`, `isDarkFor()` — semua di `src/lib/stores/ui.store.ts`. **Jangan** memakai store `darkMode` global (sudah dihapus).
- **Admin**: switch tema **seperti sebelumnya** — tombol `Light Mode / Dark Mode` di footer `AppSidebar` (`bottom-actions`) + ikon di `AppTopbar` (variant non-minimal). **Jangan** menaruhnya di samping avatar.
- **Member**: **TIDAK ADA switch tema** — halaman member selalu TERANG. Tombol tema sudah dihapus dari `GmailShell` & `MailboxTopbar`. `setTheme('member', ...)` diabaikan, `isDarkFor('member')` selalu `false`, dan `app.html` hanya applying gelap bila scope=`admin`.

## Mode gelap / terang (WAJIB konsisten member & admin)
- Semua komponen Gmail memakai **token `--gm-*`** yang didefinisikan di `src/app.css` (light + `data-theme='dark'`), bukan hex hardcoded. Kalau butuh warna baru, tambahkan token, jangan hex.
- Token: `--gm-bg`, `--gm-surface-2`, `--gm-surface-3`, `--gm-text`, `--gm-muted`, `--gm-border`, `--gm-line`, `--gm-hover`, `--gm-selected`, `--gm-blue`, `--gm-blue-soft`, `--gm-blue-strong`, `--gm-green`, `--gm-star-off`, `--gm-star-hover`, `--gm-danger`, `--gm-danger-soft`, `--gm-body-bg`, `--gm-scrim`.
- Admin & member memakai komponen yang sama (`GmailInbox`, `GmailEmail`), sehingga tema otomatis seragam. Halaman admin **tidak** boleh membuat daftar email/tab sendiri.

## Komponen reusable (WAJIB dipakai ulang)
- **`GmailShell.svelte`** — shell seluruh aplikasi: top bar (hamburger, logo, search pill, avatar) + sidebar (desktop collapse / mobile drawer) + area konten. Dipakai semua halaman inbox & detail.
- **`GmailInbox.svelte`** — daftar email Gmail, reusable untuk member & admin. Props:
  - `emails`, `trashEmails` — data dari server
  - `emailHrefPrefix`, `apiHrefPrefix` — prefix URL detail & API (member `/me/...`, admin `/users/:id/...`)
  - `view: 'inbox'|'starred'|'trash'` + `onViewChange` (opsional). Jika `onViewChange` diisi, tab **Kotak Masuk / Berbintang / Sampah** dirender di atas toolbar.
  - `isSearching`, `resultCount`
  - Sudah termasuk: bulk select (indeterminate), bulk tandai baca/belum baca, bulk hapus, checkbox per baris, aksi hover (bintang, tandai baca/belum baca, hapus/pulihkan), pagination 50/halaman, bintang SVG hijau.
- **Sidebar admin (`AppSidebar`) TIDAK auto-collapse saat klik di luar** — hanya berubah lewat tombol hamburger / otomatis di mobile. Jangan tambahkan lagi perilaku "klik luar = ciutkan", karena halaman daftar email jadi terasa melompat.
- **`MailRow.svelte`** (molecule) — baris email seragam untuk SEMUA daftar (GmailInbox member/admin + halaman "Semua Email"). Props: `href`, `sender`, `subject`, `snippet`, `receivedAt`, `isRead`, `isStarred`, `recipient`, `showLeading`, `showRecipient`, `showStar`, `showActions`, `selected`. Slot: `leading` (checkbox), `star`, `actions`. Styling pakai token `--gm-*`.
- **`GmailTabs.svelte`** — tab Kotak Masuk / Berbintang / Sampah (aktif bergaris bawah). Props: `view`, `basePath`, `searchQuery`. Dipakai **di atas** daftar email (admin inbox) **dan** di atas detail email admin, sehingga menu tetap terlihat & active saat membuka email.
- **`GmailEmail.svelte`** — halaman detail email. Props: `email`, `apiBase`, `backHref`.

### Jebakan nama kelas global (PENTING)
- `src/app.css` punya `.layout-shell .main { min-height: 100dvh; padding-left: ... }`. **Jangan** memberi nama kelas `main` pada elemen di dalam komponen Gmail, karena akan ikut mewarisi `min-height: 100dvh` dan baris jadi raksasa. GmailInbox memakai `.row-link` (bukan `.main`).
- **Jangan** menulis daftar email baru di halaman lain — pakai `GmailInbox`.

## Endpoint yang sudah ada (jangan duplikasi)
- `GET` / `PATCH /api/me/emails/:id` — aksi: `star`, `delete`, `untrash`, `read`, `unread`
- `POST /api/me/emails/bulk` — `{ ids: string[], action: 'delete'|'read'|'unread' }` → 1 query `IN (...)` + audit batch (1 request)
- `PATCH /api/users/:userId/emails/:id` — aksi sama (owner atau pemilik)
- `POST /api/users/:userId/emails/bulk` — sama, untuk admin
- **Fitur ARSIP SUDAH DIHAPUS**: tidak ada action `archive`, tab Archived, maupun query `archivedCount`. Kolom `is_archived` di DB dibiarkan (backward compatible) tapi tidak dipakai UI.

## Efisiensi (tidak boros)
- Tidak menambah request/query baru dari UI; data dari server cukup sekali load.
- Filter ruang lingkup (Kotak Masuk/Berbintang/Sampah) dan search dilakukan di client pada data yang sudah ada / query server yang sama.
- Tidak perlu fetch per-baris untuk toggle bintang; PATCH ke endpoint yang sudah ada (`/api/me/emails/:id`).

## Catatan konsistensi
- Inbox & detail harus memakai **sidebar dan top bar yang sama** (sudah dimasukkan ke `GmailShell`).
- Jika ada perubahan fitur, jangan hapus sidebar/top bar; cukup sesuaikan isinya.

---

## Standar Penamaan (WAJIB)

Aturan ini wajib diikuti setiap pengembangan (AI/manusia). Tujuannya: istilah, label, komponen, kelas CSS, event, dan endpoint tidak pernah ganda/berbeda untuk hal yang sama. Kalau butuh istilah baru, tambahkan dulu ke daftar ini.

### Bahasa
- Semua **teks UI** (label tombol, placeholder, pesan, error, tooltip, konfirmasi) memakai **Bahasa Indonesia**, kecuali istilah teknis yang sudah mapan (`owner`, `member`, `email`, `password` → tetap "password").
- **Kode** (nama variabel/fungsi/komponen/file) memakai **Bahasa Inggris** dan gaya yang sudah ada.
- Satu hal = satu sebutan di mana pun (UI, API, docs). Jangan: "Hapus"/"Delete"/"Nonaktifkan" untuk aksi yang sama.

### Kosakata data (state)
| Konsep | Sebutan resmi | Jangan dipakai untuk hal yang sama |
|---|---|---|
| Email baru/belum dibaca | `Belum Dibaca` / `is_read = 0` | unread (di UI), belum baca |
| Email penting | `Berbintang` / `is_starred` | starred (di UI) |
| Email dipindahkan ke Sampah | `Sampah` / `deleted_at` | Trash, hapus lunak |
| Email dipulihkan dari Sampah | `Pulihkan` / `untrash` | restore (di UI) |
| Penghapusan permanen email | `Hapus Permanen` | delete forever (di UI) |
| User/email dipindahkan ke Sampah | `Pindahkan ke Sampah` | Hapus (untuk aksi ini), Nonaktifkan, soft delete (di UI) |
| User dipulihkan dari Sampah | `Pulihkan` | restore (di UI) |
| Penghapusan permanen user | `Hapus Permanen` | delete user, purge (di UI) |
| Akun utama | `owner` | admin (untuk peran, di UI) |
| Akun biasa | `member` | user biasa, collaborator |
| User aktif/bisa login | `Aktif` | active (di UI) |
| User di Sampah | `Sampah` (status `disabled`) | dihapus, deleted (di UI) |

### Label tombol & aksi (persis, jangan sinonim)
- `Pindahkan ke Sampah` — soft delete user/email. Kata `Hapus` HANYA dipakai untuk penghapusan permanen.
- `Hapus Permanen` — hapus selamanya dari Sampah. TIDAK ADA di luar view Sampah.
- `Kosongkan Sampah` — hapus permanen semua isi Sampah.
- `Pulihkan` — kembalikan user/email dari Sampah.
- `Reset Password` — generate password baru (user tetap aktif).
- `Tambah User` / `Buat Massal` — pembuatan user.
- `Edit` — ubah profil user.
- `Cari`, `Batal`, `Selesai`, `Kirim`, `Salin`.
- Pesan sukses/error: pola `…berhasil dibuat`, `…dihapus`, `…dipulihkan`, `Gagal <aksi>.`, `Gagal menghubungi server. Coba lagi.`

### Halaman & view
| Halaman | Route | Komponen utama |
|---|---|---|
| Daftar user (admin) | `/users` | `UserListPanel` |
| Filter status user | `/users?status=all|active|deleted` | `StatusFilter` |
| View Sampah user | `/users?status=deleted` | sama, `trashView=true` |
| Inbox user (admin) | `/users/:userId/inbox?view=inbox|starred|trash` | `GmailInbox` |
| Semua email (admin) | `/users/emails` | `InboxTable` |
| Inbox member | `/me/inbox?view=...` | `GmailInbox` |
| Detail email | `/me/emails/:id`, `/users/:userId/emails/:id` | `GmailEmail` |
| Dashboard | `/dashboard` | `DashboardMetricsGrid` |

### Komponen (WAJIB dipakai ulang, jangan buat duplikat)
- **Atoms**: `Avatar`, `Badge`, `Button`, `CardSurface`, `Checkbox`, `Icon` (`<Icon name="material_symbol"/>`), `InputText`.
- **Molecules**: `BackLink`, `BrandLockup`, `EmailBodyViewer`, `FieldLabelInput`, `MailRow`, `MetricCard`, `Pager`, `SearchField`, `SearchSortBar`, `SidebarNavItem`, `StatusFilter`.
- **Organisms**: `AccessCodeModal`, `AppSidebar`, `AppTopbar`, `DashboardMetricsGrid`, `GmailEmail`, `GmailInbox`, `GmailShell`, `GmailTabs`, `InboxTable`, `LoginModal`, `MailboxTopbar`, `MobileBottomNav`, `UserListPanel`, `WorkerSettingsForm`.

### Event & props konvensi
- Event lintas-komponen: `usercreated`, `userchanged` (`UserListPanel` → halaman). Jangan bikin event baru tanpa alasan.
- Prop mode: `trashView` (boolean) untuk view Sampah; `view: 'inbox'|'starred'|'trash'` untuk mailbox.
- Endpoint daftar: filter lewat `?status=`, `?q=`, `?sort=`, `?page=` — nama param persis ini.

### API (persis, jangan duplikasi)
- `POST /api/users` `{ username }` — create 1 user.
- `POST /api/users/bulk` `{ mode: 'create'|'restore'|'softDelete'|'delete'|'emptyTrash' }`.
- `DELETE /api/users/:userId` header `x-mailflare-confirm: soft-delete-user|delete-user`.
- `PATCH /api/users/:userId` — `{ email, displayName, password, resetPassword, restore, telegramEnabled }`.
- Email: `PATCH /api/me/emails/:id`, `POST /api/me/emails/bulk`, dan padanan `/api/users/:userId/emails/...`. Action: `star|delete|untrash|read|unread`.
- **Tidak ada** action/label `archive` — fitur arsip sudah dihapus permanen dari UI.

### Styling
- Token warna: `--gm-*` untuk komponen Gmail (member **dan** admin), `--color-*`/`--space-*`/`--radius-*` untuk panel admin. Jangan hex hardcode.
- **Jangan** memberi nama kelas global yang sudah dipakai aturan lama (mis. `main`, `.empty` berulang lintas komponen pada panel yang sama). Class state alternatif untuk "kosong": `is-empty`, `seg-empty` — beda komponen, beda scope.
- Satu gaya = satu token/class; JANGAN menulis CSS ad-hoc per halaman untuk pola yang sama.

### Konfirmasi & proteksi
- Semua aksi destruktif WAJIB `confirm()` dengan pesan: apa yang terjadi + "Tindakan ini tidak bisa dibatalkan." jika permanen.
- Owner selalu dilindungi (tidak bisa dihapus/di-restore-sendiri); pesan: `Akun owner tidak bisa dihapus.`
- User masih di Sampah tidak bisa login; user aktif tidak bisa dihapus permanen langsung (harus masuk Sampah dulu).

### Checklist sebelum commit
1. Istilah/label sudah ada di daftar di atas (atau tambahkan dulu).
2. Komponen reusable dipakai, bukan buat baru.
3. `npm run check` = 0 error.
4. Tidak ada teks UI bahasa Inggris baru (kecuali nama komponen/role/field).

---

## Cloudflare Free Tier — WAJIB efisien

Project ini berjalan di **Cloudflare Workers + D1 + Assets (free tier)**. Semua pengembangan wajib mempertimbangkan kuota:

- **D1 (SQLite)**: free tier terbatas (ratusan juta read/bln tidak didapat; target praktis tetap hemat). Aturan:
  - Jangan query di dalam loop/render baris (**dilarang N+1**) — pakai `IN (...)` batch atau window function.
  - Setiap list WAJIB `LIMIT` + pagination server-side (jangan `SELECT *` semua lalu filter di client).
  - Query sering dipakai HARUS punya index di `schema.sql` (kolom filter + urutan). Tambah `CREATE INDEX IF NOT EXISTS` baru sekalian.
  - Housekeeping (purge sampah/retensi) harus di-**throttle** (mis. 1x per 10 menit) dan dibungkus `try/catch` agar tidak menggagalkan request.
  - Batch write besar pecah; hindari transaksi panjang.
  - `schema.sql` SELALU idempotent (`IF NOT EXISTS`, `ALTER ... ADD COLUMN` aman) karena dijalankan ke DB production.
- **Workers CPU & wall-clock**:
  - Hashing password (PBKDF2) mahal → bulk create dibatasi (maks 100), notifikasi per-user dibatasi (maks 10), jangan hash berulang untuk user yang sama.
  - Jangan loop berat/regex pathologis di worker; pindahkan parsing berat ke saat ingest email bila memungkinkan.
- **Request & KV/R2/Turnstile**: minimalkan fetch circuler antar worker; pakai `MAILFLARE_NOTIFY_URL` internal; panggil Turnstile hanya saat perlu; cookie/session lookup 1 query.
- **Aset**: jangan menambah library JS/CSS besar; komponen reusable lebih diutamakan daripada dependensi baru. `npm run check` harus 0 error sebelum `npm run deploy`.

## Komponen & kode — WAJIB reusable

- SEBELUM membuat komponen baru, cari dulu di `src/lib/components/{atoms,molecules,organisms}` dan di daftar "Standar Penamaan". Pakai/derive dari yang ada; jangan duplikat (satu fitur = satu komponen).
- Halaman baru WAJIB memakai shell/organisme yang sudah ada (`GmailShell`, `AppSidebar`, `AppTopbar`, `GmailInbox`, `MailRow`, `GmailTabs`) — jangan bikin layout/sidebar/topbar tandingan.
- Logic data bersama → `src/lib/server/services/*` + `db.ts` functions, bukan query mentah di route berulang.
- Satu source of truth untuk istilah/enum (`status`, `view`, `mode` bulk) — dipakai konsisten UI ↔ API ↔ DB.

## Aturan tambahan yang sering dilupakan (WAJIB)

1. **Secrets**: jangan pernah commit token/password/`.dev.vars`. `SETUP_TOKEN`, `TURNSTILE_SECRET_KEY`, `TELEGRAM_*` hanya lewat `.dev.vars` lokal atau `wrangler secret`. Bila token tersebar di chat/log, wajib rotate.
2. **Keamanan**: semua endpoint non-publik cek `locals.authenticated` + `sessionRole`; aksi state-changing wajib CSRF-origin check (sudah global di `hooks.server.ts`); header destruktif via `x-mailflare-confirm`; owner selalu proteksi.
3. **Retensi**: Sampah email & Sampah user retensi **30 hari** lalu hapus permanen; restore user memberi password baru dan mencabut sesi lama; reset password mencabut semua sesi user.
4. **UX konsisten**: destructive action = `confirm()` + pesan jelas; pesan error UI dalam Bahasa Indonesia; jangan bocorkan detail teknis (`D1_ERROR`, stack) ke user.
5. **Aksesibilitas & mobile**: semua tombol ikon punya `aria-label` + `title`; baris list responsive (lihat media query di `UserListPanel`); modal jadi bottom-sheet di mobile.
6. **Performa UI**: daftar panjang pakai pagination (`Pager`), bukan render semua; checkbox bulk selectable hanya untuk baris yang valid (owner dikunci).
7. **Deployment**: perubahan selalu diakhiri `npm run check` (0 error) lalu `npm run deploy`; catat `Current Version ID` di respons terakhir.
8. **Dokumentasi**: setiap istilah/komponen/endpoint baru WAJIB ditambahkan ke daftar di agent.md sebelum/bersama implementasi.
9. **Rate limiting**: endpoint login/register/access-code WAJIB punya rate limit (pakai `src/lib/server/rate-limit.ts`); aksi sensitif (reset password, bulk) juga dibatasi per sesi/IP.
10. **Backup sebelum migrasi destruktif**: sebelum `schema.sql`/migrasi yang mengubah/menghapus kolom-data, ekspor dulu DB production (`npm run d1:export` / `wrangler d1 export`) dan simpan cadangannya; migrasi baru dijalankan jika backup sukses.

11. **Privasi email (keamanan, bukan pembatasan admin)**: isi email (`raw_mime`, `body_text`, `body_html`) memiliki akses penuh hanya untuk pemilik user dan owner/admin — admin BOLEH melihat isi email setiap member (mis. lewat `/users/:userId/inbox` & detail). Yang DILARANG: menulis isi email ke log/analytics/notifikasi error, menampilkan isi di email/notifikasi Telegram, atau mengekspor massal tanpa alasan. Notifikasi/log cukup metadata (pengirim, subjek, tanggal, ukuran). `raw_mime` ikut retensi Sampah (30 hari) lalu ikut terhapus.
