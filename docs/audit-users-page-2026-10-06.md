# Audit Halaman `/users` — 2026-10-06 (terverifikasi kode)

Catatan audit performa/UX halaman daftar user admin. Setiap poin sudah diverifikasi terhadap kode sumber (file:line).

## Terverifikasi (fakta dari kode)

1. **`page` tidak dijepit ke jumlah halaman** — `src/routes/users/+page.server.ts:19` hanya `Math.max(page, 1)`; kalau user melompat ke page > max, hasil kosong tapi UI menampilkan "Belum ada user." (menyesatkan).
2. **`LIMIT`/`OFFSET` di-bind sebagai string** — `src/lib/server/db.ts:516` (`bindings.push(String(limit), String(offset))`). Berjalan di D1, tapi rapuh; idealnya number.
3. **`hasTelegramEnabledColumn` di-cache global per isolate** — `src/lib/server/db.ts:86-103`. Kalau kolom ditambah di tengah hidup worker, cache tidak di-refresh.
4. **5 query per load halaman users** — `src/routes/users/+page.server.ts:23-28` (getUsers + 4x countUsers). Bisa digabung jadi 1–2 query agar hemat kuota D1.
5. **Seluruh blok kiri baris user langsung link ke inbox** — `UserListPanel.svelte` (`a.identity-link`); tidak ada title/tooltip, jadi affordance tidak jelas.
6. **Empty-state Sampah masih ikon `person_off`** — `UserListPanel.svelte:585` (teks sudah `Sampah kosong.`, ikon belum).
7. **Modal tidak bisa ditutup via Esc** — tidak ada handler `keydown` Escape di `UserListPanel.svelte` (hanya klik backdrop/tombol).
8. **Semua aksi destruktif memakai `confirm()` native** — `UserListPanel.svelte:108,147,181,215,431,472,497,529`. Konsisten secara fungsi, tapi menonjol gaya browser.
9. **Tidak ada loading state** — tidak ada indikator pending di `users/+page.svelte` saat klik filter/sort/pagination/search (goto menunggu respons server).

## Koreksi dari audit awal (TIDAK valid)

- ~~Search input tidak ada tombol clear~~ — input bertipe `type="search"` (`SearchSortBar.svelte:32`), yang sudah menyediakan tombol clear native di browser. Tidak perlu diperbaiki.

## Prioritas perbaikan yang disarankan

(1) jepit `page` ke max, (6) ikon empty-state Sampah, (9) loading indicator, (4) gabungkan count query, (2) bind number.

## Status perbaikan (2026-10-06, deploy a000c40d)

- [x] (1) `page` di-clamp ke `maxPage` di load
- [x] (2) `LIMIT`/`OFFSET` di-bind sebagai number
- [x] (3) cache kolom telegram per-instance (`WeakMap`)
- [x] (4) count digabung 1 query (`countUsersBreakdownFromDb`) + fallback
- [x] (5) tooltip "Buka inbox user ini" pada blok identitas
- [x] (6) ikon empty-state Sampah: `delete` (view Sampah) / `person_off` (lain)
- [x] (7) modal ditutup via tombol `Esc`
- [x] (9) indikator "Memuat data..." saat navigasi filter/sort/paging
- [ ] (8) `confirm()` native tetap dipakai (konsisten, fungsional) — tidak diubah

## Perbaikan bulk select (deploy f5d39bb5)

- **Bug**: checkbox baris & highlight `.row.selected` memakai fungsi `isSelected(user.id)` di template — Svelte legacy tidak melacak pemanggilan fungsi, jadi klik "Pilih semua" tidak mengubah checkbox baris.
- **Fix**: langsung pakai nilai reaktif `selectedSet.has(user.id)` di template (`UserListPanel.svelte`), dan fungsi `isSelected` dihapus.
- **Sudah dioptimalkan sebelumnya**: tombol bulk hanya muncul untuk aksi yang relevan per view (Hapus di aktif, Pulihkan/Hapus Permanen/Kosongkan Sampah di Sampah), seleksi dipangkas saat pindah halaman/filter.

## Perbaikan halaman Inbox admin (deploy ed8f2569)

- **MailRow**: template grid desktop salah kolom saat `has-leading` (subjek terjepit jadi kolom 96px, waktu melar, aksi terdorong) — diperbaiki `26px 26px 1fr 2.4fr 92px auto`; pada mobile, `star-cell` dipindah ke area actions agar tidak menimpa checkbox.
- **Search hilang di admin inbox**: `AppTopbar variant="minimal"` menyembunyikan search — admin inbox ganti ke topbar full sehingga field "Cari email…" muncul lagi.
- Diverifikasi screenshot desktop (kolom normal: pengirim | subjek – cuplikan | waktu | aksi) dan mobile (tanpa overlap).
