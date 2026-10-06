import type { RequestEvent } from '@sveltejs/kit';
import type { EmailDetailDto, EmailDto, UserDto } from '$lib/types/dto';
import {
  getEmailByIdFromDb,
  getUserArchivedEmailCountFromDb,
  getUserByIdFromDb,
  getUserInboxFromDb,
  getUserTrashFromDb,
  getUsersFromDb,
  purgeExpiredTrashInDb,
  searchUserInboxFromDb,
  type SearchUserInboxResult
} from '$lib/server/db';

export async function getUsers(event: RequestEvent): Promise<UserDto[]> {
  return getUsersFromDb(event.platform?.env?.DB);
}

export async function getUserInbox(event: RequestEvent, userId: string): Promise<EmailDto[]> {
  return getUserInboxFromDb(event.platform?.env?.DB, userId);
}

export async function searchUserInbox(
  event: RequestEvent,
  userId: string,
  query: string
): Promise<SearchUserInboxResult> {
  return searchUserInboxFromDb(event.platform?.env?.DB, userId, { query });
}

// Retensi Sampah: hapus permanen email yang sudah lewat 30 hari.
// Dijalankan "lazy" (throttle 10 menit per isolate) supaya tidak menambah query
// di setiap request tapi tetap otomatis untuk semua akun member.
const TRASH_PURGE_INTERVAL_MS = 10 * 60 * 1000;
let lastTrashPurgeAt = 0;

export async function purgeExpiredTrashThrottled(event: RequestEvent): Promise<void> {
  const now = Date.now();
  if (now - lastTrashPurgeAt < TRASH_PURGE_INTERVAL_MS) {
    return;
  }
  lastTrashPurgeAt = now;

  try {
    await purgeExpiredTrashInDb(event.platform?.env?.DB);
  } catch {
    // Purge adalah housekeeping; kegagalan tidak boleh mengganggu request.
  }
}

export async function getUserTrash(event: RequestEvent, userId: string): Promise<EmailDto[]> {
  await purgeExpiredTrashThrottled(event);
  return getUserTrashFromDb(event.platform?.env?.DB, userId);
}

export async function getUserArchivedEmailCount(event: RequestEvent, userId: string): Promise<number> {
  return getUserArchivedEmailCountFromDb(event.platform?.env?.DB, userId);
}

export async function getUserById(event: RequestEvent, userId: string): Promise<UserDto | null> {
  return getUserByIdFromDb(event.platform?.env?.DB, userId);
}

export async function getUserEmailById(
  event: RequestEvent,
  userId: string,
  emailId: string
): Promise<EmailDetailDto | null> {
  return getEmailByIdFromDb(event.platform?.env?.DB, userId, emailId);
}
