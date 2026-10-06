/**
 * Tes alur kritis Sampah user di db.ts, memakai D1Database tiruan
 * di atas node:sqlite dengan schema.sql produksi.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import {
  countUsersBreakdownFromDb,
  createUsersInDb,
  countUsersFromDb,
  softDeleteUserInDb,
  restoreUserInDb,
  deleteUserPermanentlyInDb,
  deleteTrashedUsersInDb,
  purgeExpiredSoftDeletedUsersInDb
} from './db';

class FakeD1 {
  db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec(readFileSync('schema.sql', 'utf8'));
  }
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    const wrap = (bindings: unknown[]) => ({
      all: async <T = Record<string, unknown>>() => ({ results: stmt.all(...(bindings as never[])) as T[] }),
      first: async <T = Record<string, unknown>>() => (stmt.get(...(bindings as never[])) as T) ?? null,
      run: async () => {
        const info = stmt.run(...(bindings as never[]));
        return { meta: { changes: Number(info.changes ?? 0) } };
      }
    });
    return {
      bind: (...b: unknown[]) => wrap(b),
      ...wrap([])
    };
  }
  async batch(stmts: Array<{ sql?: string } & Record<string, unknown>>) {
    for (const s of stmts as never[]) {
      // FakeD1 statement wrapper: panggil .run() yang sudah di-bind
      await (s as { run: () => Promise<unknown> }).run();
    }
  }
}

type FakeDb = D1Database;
const asD1 = (f: FakeD1) => f as unknown as FakeDb;

async function seed(db: FakeD1) {
  await createUsersInDb(asD1(db), [
    { email: 'owner@example.com', displayName: 'owner', passwordHash: 'x' },
    { email: 'andi@example.com', displayName: 'andi', passwordHash: 'x' },
    { email: 'budi@example.com', displayName: 'budi', passwordHash: 'x' }
  ]);
  // Samakan urutan created_at agar owner deterministik (created_at pertama = owner).
  fakeFixOrdering(db);
}

function fakeFixOrdering(db: FakeD1) {
  const rows = db.db.prepare('SELECT id, email FROM users ORDER BY rowid').all() as Array<{ id: string; email: string }>;
  const stamps = ['2026-01-01 00:00:00', '2026-01-02 00:00:00', '2026-01-03 00:00:00'];
  rows.forEach((r, i) => {
    db.db.prepare('UPDATE users SET created_at=? WHERE id=?').run(stamps[i], r.id);
  });
}

describe('Alur Sampah user', () => {
  let fake: FakeD1;
  beforeEach(async () => {
    fake = new FakeD1();
    await seed(fake);
  });

  it('create duplikat aktif → sudah terdaftar; duplikat di sampah → ada di Sampah', async () => {
    const rows = fake.db.prepare('SELECT id, email FROM users').all() as Array<{ id: string; email: string }>;
    const andi = rows.find((r) => r.email === 'andi@example.com')!;
    await softDeleteUserInDb(asD1(fake), andi.id);

    const result = await createUsersInDb(asD1(fake), [
      { email: 'budi@example.com', displayName: 'budi', passwordHash: 'x' },
      { email: 'andi@example.com', displayName: 'andi', passwordHash: 'x' }
    ]);
    const reasons = Object.fromEntries(result.skipped.map((s) => [s.email, s.reason]));
    expect(reasons['budi@example.com']).toBe('sudah terdaftar');
    expect(reasons['andi@example.com']).toContain('Sampah');
    expect(result.created).toHaveLength(0);
  });

  it('hapus (soft delete) lalu pulihkan membuat user aktif lagi', async () => {
    const rows = fake.db.prepare('SELECT id FROM users WHERE email=?').all('andi@example.com') as Array<{ id: string }>;
    const id = rows[0].id;
    expect((await softDeleteUserInDb(asD1(fake), id)).deleted).toBe(true);
    // tidak bisa login: password_hash NULL
    const row = fake.db.prepare('SELECT password_hash, deleted_at FROM users WHERE id=?').get(id) as { password_hash: string | null; deleted_at: string | null };
    expect(row.password_hash).toBeNull();
    expect(row.deleted_at).not.toBeNull();

    const restored = await restoreUserInDb(asD1(fake), id, 'newhash');
    expect(restored.restored).toBe(true);
    const row2 = fake.db.prepare('SELECT password_hash, deleted_at FROM users WHERE id=?').get(id) as { password_hash: string | null; deleted_at: string | null };
    expect(row2.password_hash).toBe('newhash');
    expect(row2.deleted_at).toBeNull();
  });

  it('hapus permanen hanya untuk user di sampah (bukan aktif/owner)', async () => {
    const rows = fake.db.prepare('SELECT id, email FROM users').all() as Array<{ id: string; email: string }>;
    const owner = rows.find((r) => r.email === 'owner@example.com')!;
    const andi = rows.find((r) => r.email === 'andi@example.com')!;

    expect((await deleteUserPermanentlyInDb(asD1(fake), andi.id)).deleted).toBe(false); // aktif → not_in_trash
    await softDeleteUserInDb(asD1(fake), andi.id);
    expect((await deleteUserPermanentlyInDb(asD1(fake), andi.id)).deleted).toBe(true);
    expect((await deleteUserPermanentlyInDb(asD1(fake), owner.id)).deleted).toBe(false);
    const count = fake.db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
    expect(count.c).toBe(2);
  });

  it('deleteTrashedUsersInDb: hanya hapus user di sampah, kosongkan sampah menghapus semua sampah', async () => {
    const rows = fake.db.prepare('SELECT id, email FROM users').all() as Array<{ id: string; email: string }>;
    const andi = rows.find((r) => r.email === 'andi@example.com')!;
    const budi = rows.find((r) => r.email === 'budi@example.com')!;
    await softDeleteUserInDb(asD1(fake), andi.id);

    // target user aktif → diskip
    const r1 = await deleteTrashedUsersInDb(asD1(fake), [budi.id]);
    expect(r1.deleted).toHaveLength(0);
    expect(r1.skipped[0].reason).toBe('user masih aktif');

    // kosongkan sampah
    await softDeleteUserInDb(asD1(fake), budi.id);
    const r2 = await deleteTrashedUsersInDb(asD1(fake), null);
    expect(r2.deleted.sort()).toEqual([andi.id, budi.id].sort());
    const count = fake.db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
    expect(count.c).toBe(1); // owner tersisa
  });

  it('purge menghapus hanya user sampah >30 hari', async () => {
    const rows = fake.db.prepare('SELECT id FROM users ORDER BY created_at LIMIT 2').all() as Array<{ id: string }>;
    // Sampah baru (belum lewat 30 hari) dan sampah lama (40 hari)
    fake.db.prepare("UPDATE users SET password_hash=NULL, deleted_at=datetime('now') WHERE id=?").run(rows[0].id);
    fake.db.prepare("UPDATE users SET password_hash=NULL, deleted_at=datetime('now','-40 days') WHERE id=?").run(rows[1].id);

    const purged = await purgeExpiredSoftDeletedUsersInDb(asD1(fake));
    expect(purged).toBe(1);
    const remain = fake.db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number };
    expect(remain.c).toBe(2);
  });

  it('countUsersBreakdownFromDb konsisten dengan countUsersFromDb', async () => {
    const rows = fake.db.prepare("SELECT id FROM users WHERE email='andi@example.com'").all() as Array<{ id: string }>;
    await softDeleteUserInDb(asD1(fake), rows[0].id);
    const b = await countUsersBreakdownFromDb(asD1(fake), { search: '', status: 'all' });
    expect(b.total).toBe(3);
    expect(b.totalAll).toBe(3);
    expect(b.totalActive).toBe(2);
    expect(b.totalDeleted).toBe(1);
    const b2 = await countUsersBreakdownFromDb(asD1(fake), { search: 'andi', status: 'active' });
    expect(b2.total).toBe(0);
    expect(b2.totalActive).toBe(0);
    expect(b2.totalDeleted).toBe(1);
  });

  it('countUsersFromDb filter aktif vs sampah konsisten', async () => {
    const rows = fake.db.prepare("SELECT id FROM users WHERE email='andi@example.com'").all() as Array<{ id: string }>;
    await softDeleteUserInDb(asD1(fake), rows[0].id);
    expect(await countUsersFromDb(asD1(fake), { status: 'all' })).toBe(3);
    expect(await countUsersFromDb(asD1(fake), { status: 'active' })).toBe(2);
    expect(await countUsersFromDb(asD1(fake), { status: 'deleted' })).toBe(1);
  });
});
