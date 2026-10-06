import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { emptyTrashForUserInDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals, platform }) => {
  const userId = locals.sessionUserId;
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await emptyTrashForUserInDb(platform?.env?.DB, userId);
    return json({ ok: true, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('DB binding is required')) {
      return json({ error: 'Database is not configured' }, { status: 503 });
    }

    return json({ error: 'Failed to empty trash' }, { status: 500 });
  }
};