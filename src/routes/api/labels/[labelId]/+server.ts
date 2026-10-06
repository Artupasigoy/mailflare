import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteLabelInDb, updateLabelInDb } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ platform, params, request, locals }) => {
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
    const result = await updateLabelInDb(platform?.env?.DB, params.labelId, { name, color: body?.color, visible: body?.visible });
    if (!result.ok) {
      if (result.reason === 'not_found') {
        return json({ error: 'Label tidak ditemukan' }, { status: 404 });
      }
      if (result.reason === 'already_exists') {
        return json({ error: 'Label dengan nama itu sudah ada' }, { status: 409 });
      }
      return json({ error: 'Nama label tidak valid' }, { status: 400 });
    }
    return json({ ok: true, label: result.label });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }
    return json({ error: 'Gagal memperbarui label' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ platform, params, locals }) => {
  if (!locals.authenticated || locals.sessionRole !== 'owner') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await deleteLabelInDb(platform?.env?.DB, params.labelId);
    if (!result.ok) {
      return json({ error: 'Label tidak ditemukan' }, { status: 404 });
    }
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }
    return json({ error: 'Gagal menghapus label' }, { status: 500 });
  }
};