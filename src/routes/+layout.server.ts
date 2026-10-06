import type { LayoutServerLoad } from './$types';
import {
  purgeExpiredSoftDeletedUsersThrottled,
  purgeExpiredTrashThrottled
} from '$lib/server/services/users.service';

export const load: LayoutServerLoad = async (event) => {
  const { locals } = event;

  // Housekeeping: bersihkan Sampah > 30 hari untuk SEMUA akun.
  // Dipanggil di layout utama sehingga ikut jalan di semua halaman member & admin.
  await purgeExpiredTrashThrottled(event);

  // Retensi user soft-deleted (> 30 hari) hanya relevan untuk admin.
  if (locals.sessionRole === 'owner') {
    await purgeExpiredSoftDeletedUsersThrottled(event);
  }

  return {
    sessionRole: locals.sessionRole ?? null,
    sessionEmail: locals.sessionEmail ?? null,
    sessionDisplayName: locals.sessionDisplayName ?? null
  };
};
