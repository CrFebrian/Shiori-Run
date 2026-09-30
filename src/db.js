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

// Migrasi ringan: tambah kolom baru kalau belum ada, tanpa hapus data lama.
// Perlu ini karena user yang udah pakai bot dari awal punya tabel `runs`
// versi lama (tanpa kolom ini).
const kolomAda = db.prepare('PRAGMA table_info(runs)').all().map(c => c.name);
for (const [kolom, tipe] of [
  ['detak_jantung_avg', 'INTEGER'],
  ['elevasi_m', 'REAL'],
  ['zona_dominan', 'TEXT'],
]) {
  if (!kolomAda.includes(kolom)) {
    db.exec(`ALTER TABLE runs ADD COLUMN ${kolom} ${tipe}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS buddy_prefs (
    user_id TEXT PRIMARY KEY,
    jam_menit INTEGER NOT NULL,   -- menit sejak 00:00, dari parseJam()
    lokasi_nama TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    radius_km REAL NOT NULL,
    pace_detik INTEGER NOT NULL,  -- target pace, detik per km
    updated_at INTEGER NOT NULL
  );
`);

export function upsertBuddyPref({ userId, jamMenit, lokasiNama, lat, lon, radiusKm, paceDetik }) {
  db.prepare(`
    INSERT INTO buddy_prefs (user_id, jam_menit, lokasi_nama, lat, lon, radius_km, pace_detik, updated_at)
    VALUES (@userId, @jamMenit, @lokasiNama, @lat, @lon, @radiusKm, @paceDetik, @updatedAt)
    ON CONFLICT(user_id) DO UPDATE SET
      jam_menit = excluded.jam_menit,
      lokasi_nama = excluded.lokasi_nama,
      lat = excluded.lat,
      lon = excluded.lon,
      radius_km = excluded.radius_km,
      pace_detik = excluded.pace_detik,
      updated_at = excluded.updated_at
  `).run({ userId, jamMenit, lokasiNama, lat, lon, radiusKm, paceDetik, updatedAt: Date.now() });
}

export function getBuddyPref(userId) {
  return db.prepare('SELECT * FROM buddy_prefs WHERE user_id = ?').get(userId);
}

export function deleteBuddyPref(userId) {
  const info = db.prepare('DELETE FROM buddy_prefs WHERE user_id = ?').run(userId);
  return info.changes > 0;
}

export function listOtherBuddyPrefs(excludeUserId) {
  return db.prepare('SELECT * FROM buddy_prefs WHERE user_id != ?').all(excludeUserId);
}

export function insertRun({
  userId, jarakKm, durasiDetik, tanggal,
  detakJantung = null, elevasiM = null, zonaDominan = null,
}) {
  const stmt = db.prepare(`
    INSERT INTO runs (user_id, jarak_km, durasi_detik, tanggal, detak_jantung_avg, elevasi_m, zona_dominan, created_at)
    VALUES (@userId, @jarakKm, @durasiDetik, @tanggal, @detakJantung, @elevasiM, @zonaDominan, @createdAt)
  `);
  const info = stmt.run({ userId, jarakKm, durasiDetik, tanggal, detakJantung, elevasiM, zonaDominan, createdAt: Date.now() });
  return { id: info.lastInsertRowid };
}

export function getRunById(id, userId) {
  return db.prepare('SELECT * FROM runs WHERE id = ? AND user_id = ?').get(id, userId);
}

// patch: object berisi salah satu/lebih dari jarakKm, durasiDetik, tanggal,
// detakJantung, elevasiM, zonaDominan. Cuma field yang ada di patch yang di-update.
const REVISI_FIELD_MAP = {
  jarakKm: 'jarak_km',
  durasiDetik: 'durasi_detik',
  tanggal: 'tanggal',
  detakJantung: 'detak_jantung_avg',
  elevasiM: 'elevasi_m',
  zonaDominan: 'zona_dominan',
};

export function updateRun(id, userId, patch) {
  const keys = Object.keys(patch).filter(k => REVISI_FIELD_MAP[k]);
  if (keys.length === 0) return false;
  const setClause = keys.map(k => `${REVISI_FIELD_MAP[k]} = @${k}`).join(', ');
  const info = db.prepare(`UPDATE runs SET ${setClause} WHERE id = @id AND user_id = @userId`)
    .run({ ...patch, id, userId });
  return info.changes > 0;
}

export function deleteRun(id, userId) {
  const info = db.prepare('DELETE FROM runs WHERE id = ? AND user_id = ?').run(id, userId);
  return info.changes > 0;
}

export function listRuns(userId, limit = 10) {
  return db.prepare(`
    SELECT id, jarak_km AS jarakKm, durasi_detik AS durasiDetik, tanggal,
           detak_jantung_avg AS detakJantung, elevasi_m AS elevasiM, zona_dominan AS zonaDominan
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
      COALESCE(MAX(jarak_km), 0) AS jarakTerjauh,
      ROUND(AVG(detak_jantung_avg)) AS rataDetakJantung,
      COALESCE(SUM(elevasi_m), 0) AS totalElevasi
    FROM runs
    WHERE user_id = ? AND tanggal LIKE ?
  `).get(userId, `${bulan}-%`);
  return row;
}
