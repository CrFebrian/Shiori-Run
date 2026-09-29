import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'lari.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    jarak_km REAL NOT NULL,
    durasi_detik INTEGER NOT NULL,
    tanggal TEXT NOT NULL,       -- 'YYYY-MM-DD'
    created_at INTEGER NOT NULL  -- unix ms, buat urutan /riwayat
  );
  CREATE INDEX IF NOT EXISTS idx_runs_user_tanggal ON runs (user_id, tanggal);
`);

export function insertRun({ userId, jarakKm, durasiDetik, tanggal }) {
  const stmt = db.prepare(`
    INSERT INTO runs (user_id, jarak_km, durasi_detik, tanggal, created_at)
    VALUES (@userId, @jarakKm, @durasiDetik, @tanggal, @createdAt)
  `);
  const info = stmt.run({ userId, jarakKm, durasiDetik, tanggal, createdAt: Date.now() });
  return { id: info.lastInsertRowid };
}

export function deleteRun(id, userId) {
  const info = db.prepare('DELETE FROM runs WHERE id = ? AND user_id = ?').run(id, userId);
  return info.changes > 0;
}

export function listRuns(userId, limit = 10) {
  return db.prepare(`
    SELECT id, jarak_km AS jarakKm, durasi_detik AS durasiDetik, tanggal
    FROM runs WHERE user_id = ?
    ORDER BY tanggal DESC, created_at DESC
    LIMIT ?
  `).all(userId, limit);
}

// bulan format 'YYYY-MM'
export function getRekapBulan(userId, bulan) {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS jumlahLari,
      COALESCE(SUM(jarak_km), 0) AS totalJarak,
      COALESCE(SUM(durasi_detik), 0) AS totalDurasi,
      COALESCE(MAX(jarak_km), 0) AS jarakTerjauh
    FROM runs
    WHERE user_id = ? AND tanggal LIKE ?
  `).get(userId, `${bulan}-%`);
  return row;
}
