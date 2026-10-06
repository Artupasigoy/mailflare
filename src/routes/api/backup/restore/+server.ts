import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserAuthByEmail } from '$lib/server/db';
import { verifyPassword } from '$lib/server/security';
import { checkRateLimit, rateLimitKey } from '$lib/server/rate-limit';
import { restoreEncryptedBackup, type BackupEnvelope } from '$lib/server/backup';

export const POST: RequestHandler = async ({ platform, request, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = checkRateLimit(rateLimitKey(request, 'backup-restore'), 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json({ error: `Terlalu banyak permintaan. Coba lagi dalam ${limit.retryAfterSeconds} detik.` }, { status: 429 });
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: 'Database is not configured' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Expected JSON body' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { password?: string; passphrase?: string; envelope?: BackupEnvelope; mode?: string }
    | null;
  const password = (body?.password ?? '').trim();
  const passphrase = body?.passphrase ?? '';
  const mode = body?.mode === 'replace' ? 'replace' : 'merge';

  if (password.length < 8) {
    return json({ error: 'Password akun owner wajib diisi.' }, { status: 400 });
  }
  if (!passphrase) {
    return json({ error: 'Passphrase backup wajib diisi.' }, { status: 400 });
  }
  if (!body?.envelope || typeof body.envelope !== 'object') {
    return json({ error: 'File backup tidak valid.' }, { status: 400 });
  }
  if (mode === 'replace') {
    const confirmation = request.headers.get('x-mailflare-confirm');
    if (confirmation !== 'restore-replace') {
      return json({ error: 'Konfirmasi restore (replace) diperlukan.' }, { status: 400 });
    }
  }

  try {
    // Re-auth: wajib password owner, bukan sekadar sesi.
    const owner = await getUserAuthByEmail(db, locals.sessionEmail ?? '');
    if (!owner?.passwordHash || !(await verifyPassword(password, owner.passwordHash))) {
      return json({ error: 'Password owner salah.' }, { status: 401 });
    }

    const summary = await restoreEncryptedBackup(db, body.envelope, passphrase, mode);
    const totalRows = Object.values(summary.restored).reduce((sum, count) => sum + count, 0);
    return json({ ok: true, summary, totalRows }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Backup restore error:', message);
    const known = [
      'File bukan backup Mailflare yang valid.',
      'Versi backup tidak didukung. Perbarui aplikasi.',
      'Passphrase salah atau file backup rusak.',
      'Isi backup tidak dapat dibaca.',
      'Struktur backup tidak valid.'
    ].find((item) => message.includes(item.slice(0, 24)));
    return json({ error: known ?? 'Gagal memulihkan backup.' }, { status: 400 });
  }
};