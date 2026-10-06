import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserInboxFromDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform, params }) => {
  if (!locals.authenticated) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isOwner = locals.sessionRole === 'owner';
  if (!isOwner && locals.sessionUserId !== params.userId) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const emails = await getUserInboxFromDb(platform?.env?.DB, params.userId);
  return json({ userId: params.userId, emails });
};