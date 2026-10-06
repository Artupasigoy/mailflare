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

  let result = await getAllInboxEmailsFromDb(db, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    search
  });

  // Jepit halaman ke rentang valid agar paginasi tidak kosong/menyesatkan.
  const maxPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(page, maxPage);
  if (safePage !== page) {
    result = await getAllInboxEmailsFromDb(db, {
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
      search
    });
  }

  return {
    emails: result.items,
    total: result.total,
    page: safePage,
    pageSize: PAGE_SIZE,
    search
  };
};
