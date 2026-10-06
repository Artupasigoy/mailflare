import { describe, it, expect } from 'vitest';
import { formatMailTime } from './format';

const now = new Date('2026-10-07T16:45:00');

describe('formatMailTime', () => {
  it('menampilkan "baru saja" untuk < 1 menit di hari yang sama', () => {
    expect(formatMailTime('2026-10-07T16:44:40', now)).toBe('baru saja');
  });

  it('menampilkan "N menit yg lalu" untuk < 1 jam', () => {
    expect(formatMailTime('2026-10-07T16:44:00', now)).toBe('1 menit yg lalu');
    expect(formatMailTime('2026-10-07T16:12:00', now)).toBe('33 menit yg lalu');
    expect(formatMailTime('2026-10-07T15:46:00', now)).toBe('59 menit yg lalu');
  });

  it('menampilkan jam HH.MM untuk >= 1 jam di hari yang sama', () => {
    expect(formatMailTime('2026-10-07T15:45:00', now)).toBe('15.45');
    expect(formatMailTime('2026-10-07T09:05:00', now)).toBe('09.05');
  });

  it('menampilkan tanggal untuk hari yang berbeda walau baru beberapa menit', () => {
    expect(formatMailTime('2026-10-07T16:40:00', new Date('2026-10-08T00:05:00'))).toBe('7 Okt');
    expect(formatMailTime('2026-10-06T09:00:00', now)).toBe('6 Okt');
  });

  it('menampilkan tahun bila beda tahun', () => {
    expect(formatMailTime('2025-10-06T09:00:00', now)).toMatch(/2025/);
  });

  it('mengembalikan string kosong untuk nilai tidak valid/kosong', () => {
    expect(formatMailTime('', now)).toBe('');
    expect(formatMailTime('bukan-tanggal', now)).toBe('');
  });

  it('menerima format tanggal SQL (spasi) ', () => {
    expect(formatMailTime('2026-10-07 09:05:00', now)).toBe('09.05');
  });
});