import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createLabelInDb, getLabelsFromDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ platform, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }
  const labels = await getLabelsFromDb(platform?.env?.DB);
  return json({ labels });
};

export const POST: RequestHandler = async ({ platform, request, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Expected JSON body' }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string; color?: string; visible?: boolean } | null;
  const name = body?.name?.trim() ?? '';
  if (!name) {
    return json({ error: 'Nama label wajib diisi' }, { status: 400 });
  }
  if (name.length > 40) {
    return json({ error: 'Nama label maksimal 40 karakter' }, { status: 400 });
  }
  if (body?.visible !== undefined && typeof body.visible !== 'boolean') {
    return json({ error: 'visible harus boolean' }, { status: 400 });
  }

  try {
    const result = await createLabelInDb(platform?.env?.DB, { name, color: body?.color, visible: body?.visible });
    if (!result.ok) {
      if (result.reason === 'already_exists') {
        return json({ error: 'Label dengan nama itu sudah ada' }, { status: 409 });
      }
      return json({ error: 'Nama label tidak valid' }, { status: 400 });
    }
    return json({ ok: true, label: result.label }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }
    return json({ error: 'Gagal membuat label' }, { status: 500 });
  }
};