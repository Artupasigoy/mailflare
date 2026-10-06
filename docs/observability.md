# Observability & Operasional

## Health check

- Endpoint: `GET /api/health` → `{ "ok": true, "service": "mailflare-web-fullstack" }`
- Pakai untuk uptime monitor gratis (mis. UptimeRobot / Better Stack free) setiap 5 menit. Alert bila status != 200.

## Melihat error runtime (error 500, D1_ERROR, dll)

```bash
export CLOUDFLARE_API_TOKEN=...
npm run tail          # alias: npx wrangler tail --format pretty
```

Saat ada laporan error, jalankan `npm run tail`, lalu minta user reload halaman — stack trace muncul langsung (link `_worker.js`, fn, dan pesan error).

## Deployment

- `npm run check` harus 0 error sebelum `npm run deploy`.
- Catat `Current Version ID` hasil deploy; rollback via Cloudflare dashboard → Workers → Deployments bila perlu.

## Rate limit & keamanan

- Login/register/access-code dibatasi via `src/lib/server/rate-limit.ts`.
- CSRF origin check global untuk request non-GET ke `/api/*` (lihat `src/hooks.server.ts`).

## Backup D1

```bash
npx wrangler d1 export mailflarecloud-db --remote --output backup-YYYYMMDD.sql
```

Verifikasi drill sesekali: import ke SQLite lokal, cek jumlah baris (`users`, `emails`). Backup WAJIB dilakukan sebelum menjalankan migrasi `schema.sql`/`ALTER` yang destruktif.
