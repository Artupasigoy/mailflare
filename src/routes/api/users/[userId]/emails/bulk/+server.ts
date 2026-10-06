import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { bulkUpdateEmailsInDb, type BulkEmailAction } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals, platform, params, request }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isOwner = locals.sessionRole === 'owner';
  if (!isOwner && locals.sessionUserId !== params.userId) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return json({ error: 'Expected JSON body' }, { status: 400 });
  }

  const payload = (await request.json()) as { ids?: unknown; action?: unknown };
  const action = typeof payload.action === 'string' ? (payload.action.trim().toLowerCase() as BulkEmailAction) : '';
  if (action !== 'delete' && action !== 'read' && action !== 'unread') {
    return json({ error: 'Unsupported action' }, { status: 400 });
  }

  const ids = Array.isArray(payload.ids) ? payload.ids.map((id) => String(id)).filter((id) => id.length > 0) : [];
  if (ids.length === 0) {
    return json({ error: 'No email selected' }, { status: 400 });
  }

  try {
    const result = await bulkUpdateEmailsInDb(
      platform?.env?.DB,
      params.userId,
      ids,
      action,
      isOwner ? 'admin' : `web:${locals.sessionUserId ?? ''}`
    );
    return json({ ok: true, updated: result.updated, action });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }

    return json({ error: 'Failed to update emails' }, { status: 500 });
  }
};