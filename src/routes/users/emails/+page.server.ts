import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getAllInboxEmailsFromDb } from '$lib/server/db';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async (event) => {
  if (!event.locals.authenticated || event.locals.sessionRole !== 'owner') {
    throw redirect(303, '/auth/login');
  }

  const db = event.platform?.env?.DB;
  if (!db) {
    throw error(503, 'Database is not configured');
  }

  const search = (event.url.searchParams.get('q') ?? '').slice(0, 200).trim();
  const page = Math.max(Number(event.url.searchParams.get('page') ?? '1') || 1, 1);

  const result = await getAllInboxEmailsFromDb(db, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    search
  });

  return {
    emails: result.items,
    total: result.total,
    page,
    pageSize: PAGE_SIZE,
    search
  };
};
