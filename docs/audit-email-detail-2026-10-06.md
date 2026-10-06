# Audit Halaman Detail Email (klik email di list) — 2026-10-06 (terverifikasi kode)

## Temuan fungsi

1. **Membuka email TIDAK menandai "dibaca"** — `+page.server.ts` (`/me/emails/[emailId]`, `/users/:userId/emails/:id`) hanya load data; tidak ada aksi `read`. Email tidak berubah becomes `is_read`, badge unread & bold di list tidak berkurang. (perlu `PATCH ... action:'read'` saat load / saat buka)
2. **Toolbar detail tidak punya "Tandai belum dibaca"** — hanya Sampah & Bintang. Gmail punya tombol mark-unread di toolbar detail.
3. **Tombol Sampah di detail selalu konfirmasi "Pindahkan ke Sampah?"** walau email sudah di Sampah (`view=trash`) — harusnya jadi "Pulihkan" di Sampah / hapus permanen.
4. **Lampiran hanya teks "N lampiran"** — `EmailDetailDto` tidak berisi daftar lampiran & tidak ada link download. Email dengan lampiran tidak bisa diunduh dari UI.
5. **Tidak ada aksi balas/teruskan** (opsional, sesuai keputusan produk).

## Temuan UI/UX

6. **`kepada saya` hardcoded** di `GmailEmail.svelte:117` — di view admin (`/users/:id/emails/:id`) seharusnya "kepada {email member}".
7. **Label `BackLink` selalu "Kembali ke Kotak Masuk"** walau dibuka dari Sampah/Berbintang (`backHref` sudah benar, label belum).
8. **Pesan aksi campur bahasa** — "Email starred.", "Star removed.", "Failed to update email status.", "Unable to reach server." di `me/emails/[emailId]/+page.svelte` & `GmailEmail.svelte` (harus Indonesia).
9. **Tidak ada empty/loading state** saat detail dimuat; klik email → navigasi tanpa indikator.
10. **iframe body email aman** (`sandbox="allow-same-origin"` + theme injection OK) — tidak perlu diubah.

## Hal yang sudah baik
- Star & Sampah dari detail berfungsi via `/api/...` dengan konfirmasi.
- Tampilan HTML email distandarisasi via `EmailBodyViewer` (iframe, srcdoc, theme-aware).
- Admin bisa melihat isi email member (sesuai kebijakan privasi #11).

## Status perbaikan (deploy fee4e316)

- [x] (1) Buka detail otomatis `action:'read'` (kedua server load) + `email.isRead = true` di response
- [x] (2) Toolbar detail tambah tombol "Tandai belum dibaca"
- [x] (3) Toolbar kontekstual: view Sampah → tombol "Pulihkan" (`untrash`), view lain → "Sampah"
- [x] (6) `GmailEmail` prop `recipientLabel`; admin menampilkan `kepada <email member>`
- [x] (7) BackLink label dinamis (Kembali ke Sampah/Berbintang/Kotak Masuk)
- [x] (8) Pesan aksi diterjemahkan ke Indonesia (kedua halaman detail)
- [x] (9) Indikator "Memuat..." (`$app/stores navigating`) di kedua halaman detail
- [ ] (4) Lampiran: masih teks count (butuh kerja lanjut DTO + download) — belum
- [ ] (5) Balas/teruskan: tidak dibuat (keputusan produk)
