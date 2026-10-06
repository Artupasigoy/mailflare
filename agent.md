# AGENT NOTES — Gmail Web UI (referensi desain)

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
