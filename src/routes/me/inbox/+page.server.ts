import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import {
  getUserById,
  getUserInbox,
  getUserTrash,
  searchUserInbox
} from '$lib/server/services/users.service';

export const load: PageServerLoad = async (event) => {
  if (event.locals.sessionRole === 'owner') {
    throw redirect(303, '/dashboard');
  }

  const userId = event.locals.sessionUserId;
  if (!userId) {
    throw redirect(303, '/auth/login');
  }

  const rawQuery = (event.url.searchParams.get('q') ?? '').slice(0, 200);
  const isSearching = rawQuery.trim().length > 0;

  const [emailSource, currentUser, searchMeta, trashEmails] = await Promise.all([
    isSearching ? Promise.resolve([]) : getUserInbox(event, userId),
    getUserById(event, userId),
    isSearching ? searchUserInbox(event, userId, rawQuery) : Promise.resolve(null),
    isSearching ? Promise.resolve([]) : getUserTrash(event, userId)
  ]);

  if (!currentUser) {
    throw error(404, 'User not found');
  }

  const emails = isSearching && searchMeta ? searchMeta.items : emailSource;

  return {
    userId,
    currentUser,
    emails,
    trashEmails,
    search: isSearching
      ? {
          query: rawQuery,
          resultCount: emails.length,
          limit: 200
        }
      : null
  };
};
