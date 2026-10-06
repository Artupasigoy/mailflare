import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserAuthByEmail } from '$lib/server/db';
import { verifyPassword } from '$lib/server/security';
import { checkRateLimit, rateLimitKey } from '$lib/server/rate-limit';
import { createEncryptedBackup, isValidBackupScope } from '$lib/server/backup';

export const POST: RequestHandler = async ({ platform, request, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = checkRateLimit(rateLimitKey(request, 'backup-export'), 5, 10 * 60 * 1000);
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
    | { password?: string; passphrase?: string; scope?: string }
    | null;
  const password = (body?.password ?? '').trim();
  const passphrase = body?.passphrase ?? '';
  const scope = body?.scope ?? 'full';

  if (password.length < 8) {
    return json({ error: 'Password akun owner wajib diisi.' }, { status: 400 });
  }
  if (passphrase.length < 12) {
    return json({ error: 'Passphrase backup minimal 12 karakter.' }, { status: 400 });
  }
  if (passphrase.length > 256) {
    return json({ error: 'Passphrase backup terlalu panjang.' }, { status: 400 });
  }
  if (!isValidBackupScope(scope)) {
    return json({ error: 'Scope backup tidak valid.' }, { status: 400 });
  }

  try {
    // Re-auth: wajib password owner, bukan sekadar sesi.
    const owner = await getUserAuthByEmail(db, locals.sessionEmail ?? '');
    if (!owner?.passwordHash || !(await verifyPassword(password, owner.passwordHash))) {
      return json({ error: 'Password owner salah.' }, { status: 401 });
    }

    const envelope = await createEncryptedBackup(db, scope, passphrase);
    const totalRows = Object.values(envelope.tables).reduce((sum, count) => sum + count, 0);
    return json({ ok: true, envelope, totalRows }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Backup export error:', message);
    return json({ error: message.includes('terlalu besar') ? message : 'Gagal membuat backup.' }, { status: 500 });
  }
};