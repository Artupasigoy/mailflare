import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById, getUserEmailById } from '$lib/server/services/users.service';
import { applyEmailQuickActionInDb } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
  if (event.locals.sessionRole === 'owner') {
    throw redirect(303, '/dashboard');
  }

  const userId = event.locals.sessionUserId;
  if (!userId) {
    throw redirect(303, '/auth/login');
  }

  const [currentUser, email] = await Promise.all([
    getUserById(event, userId),
    getUserEmailById(event, userId, event.params.emailId)
  ]);
  if (!email) {
    throw error(404, 'Email not found');
  }

  // Membuka detail email otomatis menandainya sudah dibaca.
  if (!email.isRead) {
    await applyEmailQuickActionInDb(event.platform?.env?.DB, userId, email.id, 'read', userId).catch(() => undefined);
    email.isRead = true;
  }

  return {
    currentUser,
    email
  };
};
