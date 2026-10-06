import { ensureLabelVisibleColumn } from '$lib/server/db';

// ── Backup format ──────────────────────────────────────────────────────────
// Envelope JSON dengan ciphertext base64. Enkripsi AES-GCM-256, kunci
// diturunkan dari passphrase via PBKDF2-SHA256. Passphrase TIDAK pernah
// dikirim ke DB/log dan hanya hidup di memori selama request.
export const BACKUP_FORMAT = 'mailflare-backup';
export const BACKUP_VERSION = 1;
const BACKUP_KDF_ITERATIONS = 100_000;
const BACKUP_PAGE_SIZE = 1000;
// Batas aman free tier (memori Worker ±128MB): cegah ledakan. Bila lebih besar, pakai CLI.
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export type BackupScope = 'full' | 'email' | 'account';
export type RestoreMode = 'merge' | 'replace';

const BACKUP_TABLES: Record<BackupScope, string[]> = {
  // Urutan sesuai dependensi FK (parent lebih dulu).
  full: [
    'users',
    'labels',
    'user_labels',
    'api_keys',
    'worker_metrics',
    'worker_settings',
    'emails',
    'email_status_history'
  ],
  email: ['emails', 'email_status_history'],
  account: ['users', 'labels', 'user_labels', 'api_keys', 'worker_metrics', 'worker_settings']
};

// Urutan hapus (anak lebih dulu) untuk mode replace.
const DELETE_ORDER = [
  'email_status_history',
  'emails',
  'user_labels',
  'labels',
  'api_keys',
  'worker_metrics',
  'worker_settings',
  'users'
];

export interface BackupEnvelope {
  format: string;
  version: number;
  encryption: string;
  kdf: string;
  iterations: number;
  salt: string;
  iv: string;
  createdAt: string;
  scope: BackupScope;
  tables: Record<string, number>;
  ciphertext: string;
}

export interface RestoreSummary {
  scope: BackupScope;
  mode: RestoreMode;
  restored: Record<string, number>;
  createdAt: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations: BACKUP_KDF_ITERATIONS },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayload(plaintext: string, passphrase: string): Promise<{
  salt: string;
  iv: string;
  ciphertext: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher))
  };
}

async function decryptPayload(envelope: BackupEnvelope, passphrase: string): Promise<string> {
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const key = await deriveBackupKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  );
  return decoder.decode(plain);
}

async function listColumns(db: D1Database, table: string): Promise<string[]> {
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  return (results ?? []).map((row) => String(row.name));
}

async function tableExists(db: D1Database, table: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1")
    .bind(table)
    .first<{ name: string }>();
  return Boolean(row?.name);
}

async function dumpTable(db: D1Database, table: string): Promise<Array<Record<string, unknown>>> {
  if (!(await tableExists(db, table))) {
    return [];
  }
  const rows: Array<Record<string, unknown>> = [];
  let offset = 0;
  // Paginasi untuk menghindari satu query raksasa (hemat memori/CPU).
  for (;;) {
    // rowid membuat paginasi stabil (tidak ada baris terlewat/duplikat).
    const { results } = await db
      .prepare(`SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`)
      .bind(BACKUP_PAGE_SIZE, offset)
      .all<Record<string, unknown>>();
    const batch = results ?? [];
    rows.push(...batch);
    if (batch.length < BACKUP_PAGE_SIZE) {
      break;
    }
    offset += BACKUP_PAGE_SIZE;
    if (rows.length > 200_000) {
      throw new Error('Backup terlalu besar untuk free tier. Gunakan wrangler d1 export.');
    }
  }
  return rows;
}

export interface BuiltBackupData {
  createdAt: string;
  scope: BackupScope;
  tables: Record<string, Array<Record<string, unknown>>>;
}

export async function buildBackupData(db: D1Database, scope: BackupScope): Promise<BuiltBackupData> {
  const tables = BACKUP_TABLES[scope] ?? BACKUP_TABLES.full;
  const data: Record<string, Array<Record<string, unknown>>> = {};
  for (const table of tables) {
    data[table] = await dumpTable(db, table);
  }
  return { createdAt: new Date().toISOString(), scope, tables: data };
}

export async function createEncryptedBackup(
  db: D1Database,
  scope: BackupScope,
  passphrase: string
): Promise<BackupEnvelope> {
  const data = await buildBackupData(db, scope);
  const plaintext = JSON.stringify(data);
  if (encoder.encode(plaintext).length > MAX_BACKUP_BYTES) {
    throw new Error('Backup terlalu besar untuk free tier. Gunakan wrangler d1 export.');
  }

  const encrypted = await encryptPayload(plaintext, passphrase);
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(data.tables)) {
    counts[table] = rows.length;
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    encryption: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: BACKUP_KDF_ITERATIONS,
    salt: encrypted.salt,
    iv: encrypted.iv,
    createdAt: data.createdAt,
    scope,
    tables: counts,
    ciphertext: encrypted.ciphertext
  };
}

// DDL minimal idempoten agar restore berhasil di D1 baru/akun Cloudflare lain
// tanpa perlu menjalankan schema.sql manual lebih dulu.
const BACKUP_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT, password_hash TEXT,
    telegram_enabled INTEGER NOT NULL DEFAULT 0, deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL DEFAULT 'primary',
    visible INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS user_labels (
    user_id TEXT NOT NULL, label_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, label_id)
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY, key_hash TEXT NOT NULL UNIQUE, name TEXT, created_by TEXT, user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS worker_metrics (
    key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS worker_settings (
    key TEXT PRIMARY KEY, value TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, message_id TEXT, sender TEXT NOT NULL, recipient TEXT NOT NULL,
    subject TEXT, snippet TEXT, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0, is_starred INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT, raw_size INTEGER, body_text TEXT, body_html TEXT, raw_mime TEXT NOT NULL, headers_json TEXT,
    parsed_message_id TEXT, parsed_in_reply_to TEXT, parsed_references TEXT,
    parsed_from_name TEXT, parsed_from_email TEXT, parsed_sender TEXT, parsed_reply_to TEXT,
    parsed_delivered_to TEXT, parsed_return_path TEXT, parsed_to TEXT, parsed_cc TEXT, parsed_bcc TEXT,
    parsed_subject TEXT, parsed_date TEXT, parsed_text TEXT, parsed_html TEXT, parsed_text_as_html TEXT,
    parsed_headers TEXT, parsed_attachments TEXT, parsed_has_attachments INTEGER NOT NULL DEFAULT 0,
    parsed_attachment_count INTEGER NOT NULL DEFAULT 0, parsed_spam_score TEXT, parsed_auth_results TEXT,
    parsed_received_chain TEXT, parsed_content_type TEXT, parsed_charset TEXT, parsed_boundary TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS email_status_history (
    id TEXT PRIMARY KEY, email_id TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL,
    from_state TEXT NOT NULL, to_state TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  // Tabel ephemeral (tidak di-backup) tetap dibuat agar DB baru berfungsi penuh.
  `CREATE TABLE IF NOT EXISTS login_sessions (
    id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '', client_ip TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS access_codes (
    id TEXT PRIMARY KEY, code_hash TEXT NOT NULL UNIQUE, telegram_user_id TEXT NOT NULL, user_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL, used_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS access_sessions (
    id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, code_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '', client_ip TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS telegram_webhook_updates (
    update_id INTEGER PRIMARY KEY, processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  // Index penting (idempoten).
  `CREATE INDEX IF NOT EXISTS idx_emails_user_inbox ON emails(user_id, deleted_at, received_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_user_flags ON emails(user_id, deleted_at, is_read, is_starred, is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_emails_global_metrics ON emails(deleted_at, is_read, is_starred, is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_login_sessions_expires ON login_sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id, expires_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_user_labels_user ON user_labels(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_labels_label ON user_labels(label_id)`
];

function coerceValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return value;
}

async function ensureSchema(db: D1Database): Promise<void> {
  // Batch DDL → satu round-trip, hemat free tier.
  await db.batch(BACKUP_SCHEMA.map((statement) => db.prepare(statement)));
  await ensureLabelVisibleColumn(db);
}

async function clearTables(db: D1Database, scope: BackupScope): Promise<void> {
  const present = new Set(BACKUP_TABLES[scope] ?? BACKUP_TABLES.full);
  const statements = DELETE_ORDER.filter((table) => present.has(table)).map((table) =>
    db.prepare(`DELETE FROM ${table}`)
  );
  if (statements.length > 0) {
    await db.batch(statements);
  }
}

async function insertRows(
  db: D1Database,
  table: string,
  rows: Array<Record<string, unknown>>
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const allowed = new Set(await listColumns(db, table));
  const keys = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        if (allowed.has(key)) set.add(key);
      }
      return set;
    }, new Set<string>())
  );
  if (keys.length === 0) {
    return 0;
  }

  const columnSql = keys.map((key) => `"${key}"`).join(', ');
  let inserted = 0;
  const chunkSize = 50;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const statements = chunk.map((row) => {
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((key) => coerceValue(row[key]));
      return db
        .prepare(`INSERT OR REPLACE INTO ${table} (${columnSql}) VALUES (${placeholders})`)
        .bind(...values);
    });
    await db.batch(statements);
    inserted += chunk.length;
  }

  return inserted;
}

export async function restoreEncryptedBackup(
  db: D1Database,
  envelope: BackupEnvelope,
  passphrase: string,
  mode: RestoreMode
): Promise<RestoreSummary> {
  const parsed = await parseAndDecrypt(envelope, passphrase);
  const scope = (envelope.scope as BackupScope) ?? 'full';

  await ensureSchema(db);
  if (mode === 'replace') {
    await clearTables(db, scope);
  }

  const order = BACKUP_TABLES[scope] ?? BACKUP_TABLES.full;
  const restored: Record<string, number> = {};
  for (const table of order) {
    const rows = Array.isArray(parsed.tables?.[table]) ? (parsed.tables[table] as Array<Record<string, unknown>>) : [];
    restored[table] = await insertRows(db, table, rows);
  }

  return {
    scope,
    mode,
    restored,
    createdAt: parsed.createdAt ?? envelope.createdAt
  };
}

async function parseAndDecrypt(
  envelope: BackupEnvelope,
  passphrase: string
): Promise<BuiltBackupData> {
  if (!envelope || envelope.format !== BACKUP_FORMAT) {
    throw new Error('File bukan backup Mailflare yang valid.');
  }
  if (Number(envelope.version) > BACKUP_VERSION) {
    throw new Error('Versi backup tidak didukung. Perbarui aplikasi.');
  }

  let plaintext: string;
  try {
    plaintext = await decryptPayload(envelope, passphrase);
  } catch {
    throw new Error('Passphrase salah atau file backup rusak.');
  }

  let parsed: BuiltBackupData;
  try {
    parsed = JSON.parse(plaintext) as BuiltBackupData;
  } catch {
    throw new Error('Isi backup tidak dapat dibaca.');
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.tables !== 'object') {
    throw new Error('Struktur backup tidak valid.');
  }
  // Pastikan tabel yang diminta ada dan berbentuk array.
  for (const table of Object.keys(parsed.tables)) {
    if (!Array.isArray(parsed.tables[table])) {
      throw new Error('Struktur backup tidak valid.');
    }
  }
  return parsed;
}

export function isValidBackupScope(value: unknown): value is BackupScope {
  return value === 'full' || value === 'email' || value === 'account';
}