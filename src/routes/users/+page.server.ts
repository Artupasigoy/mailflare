import type { PageServerLoad } from './$types';
import { getUserCountBreakdown, getUsers } from '$lib/server/services/users.service';
import { getLabelsFromDb } from '$lib/server/db';

const PAGE_SIZE = 20;

const SORT_VALUES = ['latest_email', 'newest', 'oldest', 'name', 'most_emails', 'deleted_recent'] as const;
const STATUS_VALUES = ['all', 'active', 'deleted'] as const;

export const load: PageServerLoad = async (event) => {
  const search = (event.url.searchParams.get('q') ?? '').slice(0, 64).trim();
  const rawStatus = event.url.searchParams.get('status') ?? 'all';
  const status = (STATUS_VALUES as readonly string[]).includes(rawStatus) ? rawStatus : 'all';
  const labelId = (event.url.searchParams.get('label') ?? '').slice(0, 64).trim();

  // Default: user terbaru; di view Sampah: sampah terbaru.
  const defaultSort = status === 'deleted' ? 'deleted_recent' : 'newest';
  const rawSort = event.url.searchParams.get('sort') ?? defaultSort;
  const sort = (SORT_VALUES as readonly string[]).includes(rawSort) ? rawSort : defaultSort;

  const page = Math.max(Number(event.url.searchParams.get('page') ?? '1') || 1, 1);
  const options = { search, status: status as never, sort: sort as never, labelId: labelId || undefined };

  const [counts, labels] = await Promise.all([
    getUserCountBreakdown(event, options),
    getLabelsFromDb(event.platform?.env?.DB)
  ]);
  const { total, totalAll, totalActive, totalDeleted } = counts;

  // Jepit halaman ke rentang valid agar paginasi tidak kosong/menyesatkan.
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, maxPage);

  const users = await getUsers(event, { ...options, limit: PAGE_SIZE, offset: (safePage - 1) * PAGE_SIZE });

  return {
    users,
    total,
    totalAll,
    totalActive,
    totalDeleted,
    search,
    sort,
    status,
    labelId,
    labels,
    page: safePage,
    pageSize: PAGE_SIZE
  };
};