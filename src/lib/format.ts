/**
 * Format waktu daftar email (client & server safe).
 *
 * Aturan:
 * - Beda hari (walau baru 5 menit / 1 jam): tanggal, mis. `6 Okt`.
 * - Hari sama:
 *   - < 1 menit: `baru saja`
 *   - < 1 jam : `N menit yg lalu` (1..59)
 *   - >= 1 jam: jam `HH.MM` (24 jam), mis. `16.30`
 */
export function formatMailTime(value: string, now: Date = new Date()): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';

  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (!sameDay) {
    const sameYear = now.getFullYear() === date.getFullYear();
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' })
    });
  }

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 60_000) return 'baru saja';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} menit yg lalu`;
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}