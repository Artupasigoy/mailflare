import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUsersInDb, deleteTrashedUsersInDb, restoreUserInDb, softDeleteUsersInDb } from '$lib/server/db';
import { generateSecurePassword, hashPassword } from '$lib/server/security';
import { sendUserCreatedTelegramNotification } from '$lib/server/telegram';

const MAX_BULK = 100;
const MAX_TELEGRAM_NOTIFY = 10;

function parseUsernames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[\s,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 64) return 'panjang 3-64 karakter';
  if (username.includes('@')) return 'tidak boleh berisi @';
  if (!/^[a-z0-9._-]+$/.test(username)) return 'hanya a-z, 0-9, titik, underscore, hyphen';
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(username)) return 'harus mulai & akhir alfanumerik';
  return null;
}

function sanitizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domain);
}

export const POST: RequestHandler = async ({ platform, request, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: 'Database is not configured' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Expected JSON body' }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { mode?: string; usernames?: unknown; userIds?: unknown; password?: string }
    | null;
  // mode dinormalisasi ke huruf kecil (mis. "softDelete" -> "softdelete") agar
  // cocok dengan perbandingan di bawah.
  const mode = payload?.mode?.trim().toLowerCase();

  try {
    if (mode === 'create') {
      const rawList = parseUsernames(payload?.usernames).slice(0, MAX_BULK);
      if (rawList.length === 0) {
        return json({ error: 'Tidak ada username yang valid' }, { status: 400 });
      }

      const sharedPassword = (payload?.password ?? '').trim();
      if (sharedPassword && (sharedPassword.length < 8 || sharedPassword.length > 128)) {
        return json({ error: 'Password bersama harus 8-128 karakter' }, { status: 400 });
      }

      const domain = sanitizeDomain(platform?.env?.MAILFLARE_USER_DOMAIN ?? '');
      if (!isValidDomain(domain)) {
        return json({ error: 'MAILFLARE_USER_DOMAIN belum dikonfigurasi' }, { status: 500 });
      }

      const invalid: Array<{ username: string; reason: string }> = [];
      const seen = new Set<string>();
      let sharedHash = '';
      const prepared: Array<{ username: string; email: string; password: string; passwordHash: string }> = [];

      for (const username of rawList) {
        const reason = validateUsername(username);
        if (reason) {
          invalid.push({ username, reason });
          continue;
        }
        if (seen.has(username)) {
          invalid.push({ username, reason: 'duplikat di daftar' });
          continue;
        }
        seen.add(username);

        // Password di-hash tepat satu kali per user (PBKDF2 mahal, jangan diulang).
        const password = sharedPassword || generateSecurePassword();
        const passwordHash = sharedHash || (await hashPassword(password));
        if (sharedPassword && !sharedHash) {
          sharedHash = passwordHash;
        }
        prepared.push({ username, email: `${username}@${domain}`, password, passwordHash });
      }

      if (prepared.length === 0) {
        return json({ ok: true, created: [], skipped: [], invalid, credentials: [] }, { status: 201 });
      }

      const result = await createUsersInDb(
        db,
        prepared.map((item) => ({ email: item.email, displayName: item.username, passwordHash: item.passwordHash }))
      );

      const createdEmails = new Set(result.created.map((item) => item.email));
      const credentials = prepared
        .filter((item) => createdEmails.has(item.email))
        .map((item) => ({ username: item.username, email: item.email, password: item.password }));

      // Notifikasi Telegram dibatasi agar tidak membanjiri (maksimal 10 user).
      for (const item of credentials.slice(0, MAX_TELEGRAM_NOTIFY)) {
        await sendUserCreatedTelegramNotification(db, platform?.env, {
          username: item.username,
          email: item.email,
          password: item.password,
          createdBy: locals.sessionEmail ?? 'admin'
        }).catch(() => 0);
      }

      return json(
        {
          ok: true,
          created: result.created,
          skipped: result.skipped,
          invalid,
          credentials,
          telegramNotified: Math.min(credentials.length, MAX_TELEGRAM_NOTIFY)
        },
        { status: 201 }
      );
    }

    if (mode === 'restore') {
      const userIds = Array.isArray(payload?.userIds)
        ? payload.userIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_BULK)
        : [];
      if (userIds.length === 0) {
        return json({ error: 'Tidak ada user yang dipilih' }, { status: 400 });
      }

      const restored: Array<{ email: string; password: string }> = [];
      const skipped: Array<{ email: string; reason: string }> = [];

      for (const userId of userIds) {
        const password = generateSecurePassword(18);
        const passwordHash = await hashPassword(password);
        const result = await restoreUserInDb(db, userId, passwordHash);
        if (result.restored && result.email) {
          restored.push({ email: result.email, password });
        } else {
          skipped.push({
            email: userId,
            reason: result.reason === 'protected_owner' ? 'owner tidak boleh' : result.reason === 'not_deleted' ? 'tidak dalam status dihapus' : 'tidak ditemukan'
          });
        }
      }

      return json({ ok: true, restored, skipped });
    }

    if (mode === 'softdelete') {
      const userIds = Array.isArray(payload?.userIds)
        ? payload.userIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_BULK)
        : [];
      if (userIds.length === 0) {
        return json({ error: 'Tidak ada user yang dipilih' }, { status: 400 });
      }

      const result = await softDeleteUsersInDb(db, userIds);
      return json({ ok: true, softDeleted: result.softDeleted, skipped: result.skipped });
    }

    if (mode === 'delete') {
      const userIds = Array.isArray(payload?.userIds)
        ? payload.userIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_BULK)
        : [];
      if (userIds.length === 0) {
        return json({ error: 'Tidak ada user yang dipilih' }, { status: 400 });
      }

      const result = await deleteTrashedUsersInDb(db, userIds);
      return json({ ok: true, deleted: result.deleted.length, skipped: result.skipped });
    }

    if (mode === 'resetpassword') {
      const userIds = Array.isArray(payload?.userIds)
        ? payload.userIds.map((id) => String(id)).filter(Boolean).slice(0, MAX_BULK)
        : [];
      if (userIds.length === 0) {
        return json({ error: 'Tidak ada user yang dipilih' }, { status: 400 });
      }

      const sharedPassword = (payload?.password ?? '').trim();
      if (sharedPassword && (sharedPassword.length < 8 || sharedPassword.length > 128)) {
        return json({ error: 'Password bersama harus 8-128 karakter' }, { status: 400 });
      }

      const rows = await db
        .prepare(
          `SELECT u.id, u.email,
                  CASE WHEN u.password_hash IS NOT NULL AND u.deleted_at IS NULL THEN 'active' ELSE 'disabled' END AS status,
                  (SELECT COUNT(*) FROM users o WHERE o.id = u.id AND o.id = (SELECT id FROM users ORDER BY created_at ASC, id ASC LIMIT 1)) AS is_owner
           FROM users u
           WHERE u.id IN (${userIds.map(() => '?').join(', ')})`
        )
        .bind(...userIds)
        .all<{ id: string; email: string; status: string; is_owner: number }>();

      const reset: Array<{ id: string; email: string; password: string }> = [];
      const skipped: Array<{ id: string; email: string; reason: string }> = [];
      let sharedHash = '';

      for (const row of rows.results ?? []) {
        const id = String(row.id);
        if (Number(row.is_owner ?? 0) === 1) {
          skipped.push({ id, email: String(row.email), reason: 'user owner tidak bisa direset massal' });
          continue;
        }
        if (String(row.status) !== 'active') {
          skipped.push({ id, email: String(row.email), reason: 'user tidak aktif (di Sampah)' });
          continue;
        }

        const password = sharedPassword || generateSecurePassword(18);
        const passwordHash = sharedHash || (await hashPassword(password));
        if (sharedPassword && !sharedHash) {
          sharedHash = passwordHash;
        }
        await db
          .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(passwordHash, id)
          .run();
        await db.prepare('DELETE FROM login_sessions WHERE user_id = ?').bind(id).run();
        reset.push({ id, email: String(row.email), password });
      }

      return json({ ok: true, reset, skipped });
    }

    if (mode === 'emptytrash') {
      const result = await deleteTrashedUsersInDb(db, null);
      return json({ ok: true, deleted: result.deleted.length, skipped: result.skipped });
    }

    return json({ error: 'Unsupported mode' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }
    if (message.includes('UNIQUE constraint failed')) {
      return json({ error: 'Email sudah dipakai (termasuk user di Sampah). Pulihkan dulu atau hapus permanen user lama.' }, { status: 409 });
    }

    console.error('Bulk users error:', message);
    return json({ error: 'Failed to process bulk request' }, { status: 500 });
  }
};