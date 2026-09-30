<div align="center">

# 🏃‍♂️ Shiorun

**Bot Discord personal buat catat & pantau progress lari Lo dari manual, dari screenshot, atau cari teman lari.**

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)

</div>

---

## 📸 Preview

> Tempel screenshot atau GIF demo bot kamu di sini biar README-nya nggak monoton.
> Cara gampang: simpan gambar/GIF di folder `docs/screenshots/`, terus embed pakai:
> `![Demo /lari](docs/screenshots/lari-demo.png)`

---

## ✨ Fitur

| | Fitur | Keterangan |
|---|---|---|
| 📝 | **Log manual** | `/lari` — catat jarak, waktu, tanggal, detak jantung, elevasi, zona |
| 📷 | **Log dari foto** | `/lari-foto` — upload screenshot recap (Fitbeing/Strava/dll), dibaca otomatis pakai vision AI, tinggal konfirmasi |
| ✏️ | **Edit catatan** | `/revisi` — perbaiki data yang salah tanpa perlu hapus-input ulang |
| 📊 | **Rekap bulanan** | `/rekap` — total jarak, pace rata-rata, rata-rata detak jantung, total elevasi |
| 🗒️ | **Riwayat** | `/riwayat` — lihat catatan-catatan terakhir sekilas |
| 🗑️ | **Hapus** | `/hapus` — hapus catatan yang salah input |
| 🤝 | **Running Buddy Finder** | `/lari-buddy` — set jam/lokasi/pace, dicariin match teman lari terdekat (matching geografis pakai Haversine) |

---

## 🚀 Instalasi

```bash
# 1. Clone repo
git clone <repository-url>
cd shiorun

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# lalu isi DISCORD_TOKEN, CLIENT_ID, GUILD_ID, GROQ_API_KEY di file .env

# 4. Jalankan bot
npm start
```

> ⚠️ Node.js dikunci ke versi **22.x** (lihat `engines` di `package.json`) — `better-sqlite3` bisa gagal build di Node 24.

---

## ⚙️ Environment Variables

| Variable | Wajib? | Keterangan |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Token bot dari [Discord Developer Portal](https://discord.com/developers/applications) |
| `CLIENT_ID` | ✅ | Application ID bot kamu |
| `GUILD_ID` | ✅ | ID server tempat bot dipakai (guild-scoped command, langsung muncul instan) |
| `GROQ_API_KEY` | ⭕ | Buat `/lari-foto` — ambil gratis di [console.groq.com/keys](https://console.groq.com/keys) |

---

## 📁 Struktur Project

```
shiorun/
├── .env.example
├── package.json
├── data/                  ← database SQLite (auto-dibuat)
└── src/
    ├── index.js           ← entrypoint bot
    ├── db.js              ← query SQLite
    ├── geocode.js         ← geocoding lokasi (OpenStreetMap, gratis)
    ├── utils.js           ← parser & formatter
    └── commands/
        ├── lari.js
        ├── lari-foto.js
        ├── rekap.js
        ├── riwayat.js
        ├── revisi.js
        ├── hapus.js
        └── lari-buddy.js
```

---

## 🛠️ Teknologi

- **Node.js 22.x** + **discord.js v14** — inti bot
- **better-sqlite3** — database lokal, tanpa server terpisah
- **Groq API** (`qwen/qwen3.8-27b`) — vision AI buat baca screenshot recap
- **OpenStreetMap Nominatim** — geocoding lokasi, gratis tanpa API key

---

## 🗺️ Roadmap

- [ ] Saran rute lari beneran buat Buddy Finder (butuh Maps Directions API)
- [ ] Grafik progress bulanan
- [ ] Target lari mingguan + reminder otomatis

---

## 🤝 Kontribusi

Ini project personal, tapi kontribusi/saran tetap terbuka — buat pull request atau buka issue kalau ada ide perbaikan.

## 📄 Lisensi

MIT KURUGANE
