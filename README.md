# lari-bot

Bot Discord personal buat catat lari manual — nggak butuh Strava/Garmin/API luar.

## Command

- `/lari jarak:5km waktu:28menit [tanggal:2026-09-28]` — catat sesi lari
- `/rekap [bulan:2026-09]` — rekap bulanan (default bulan ini)
- `/riwayat [jumlah:10]` — lihat catatan terakhir
- `/hapus id:12` — hapus catatan yang salah input

Format `jarak` yang diterima: `5km`, `5.2km`, `5000m`.
Format `waktu` yang diterima: `28menit`, `1jam30menit`, `1j30m`, `28:00`, `1:30:00`, atau angka polos (dianggap menit).

## Setup

1. `npm install`
2. Buat aplikasi bot di https://discord.com/developers/applications → tab **Bot** → Reset Token → salin.
3. Copy `.env.example` jadi `.env`, isi `DISCORD_TOKEN`, `CLIENT_ID` (dari General Information), dan `GUILD_ID` (klik kanan nama server di Discord → Copy Server ID, aktifkan Developer Mode dulu kalau belum).
4. Invite bot ke server kamu lewat OAuth2 URL Generator (scope `bot` + `applications.commands`, minimal permission).
5. `npm start`

Database SQLite otomatis dibuat di `data/lari.db` saat bot pertama kali jalan — nggak perlu setup manual.

## Catatan versi Node

Dikunci ke `22.x` (lihat `engines` di `package.json`) karena `better-sqlite3` bisa gagal build/load di Node 24.
