// Parser & formatter angka lari. Semua fungsi parse* return null kalau format
// tidak dikenali — command yang manggil tinggal cek null buat balas pesan error.

// "5km", "5.2km", "5", "5000m" → jarak dalam km (number). null kalau gagal.
export function parseJarak(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase().replace(',', '.');

  let m = s.match(/^(\d+(?:\.\d+)?)\s*km?$/); // "5km", "5.2km", "5k", "5"
  if (m) return parseFloat(m[1]);

  m = s.match(/^(\d+(?:\.\d+)?)\s*m$/); // "5000m"
  if (m) return parseFloat(m[1]) / 1000;

  return null;
}

// "28menit", "28m", "1jam30menit", "1j30m", "90m", "28:00", "1:30:00"
// → durasi dalam detik (number). null kalau gagal.
export function parseDurasi(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();

  // Format jam:menit:detik atau menit:detik
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return parts[0] * 60 + parts[1]; // menit:detik
  }

  // Format kata: "1jam30menit", "1j 30m", "28menit", "90m", "45detik"
  const jamMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:jam|j)\b/);
  const menitMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:menit|min|m)\b/);
  const detikMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:detik|dtk|s)\b/);

  if (jamMatch || menitMatch || detikMatch) {
    const jam = jamMatch ? parseFloat(jamMatch[1]) : 0;
    const menit = menitMatch ? parseFloat(menitMatch[1]) : 0;
    const detik = detikMatch ? parseFloat(detikMatch[1]) : 0;
    return Math.round(jam * 3600 + menit * 60 + detik);
  }

  // Angka polos dianggap menit ("28" → 28 menit)
  if (/^\d+(?:\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 60);

  return null;
}

// 1683 → "28m 3d" ; 5400 → "1j 30m"
export function formatDurasi(totalDetik) {
  const detikBulat = Math.round(totalDetik);
  const jam = Math.floor(detikBulat / 3600);
  const menit = Math.floor((detikBulat % 3600) / 60);
  const detik = detikBulat % 60;

  const bagian = [];
  if (jam > 0) bagian.push(`${jam}j`);
  if (menit > 0 || jam > 0) bagian.push(`${menit}m`);
  bagian.push(`${detik}d`);
  return bagian.join(' ');
}

// durasiDetik=1680, jarakKm=5 → "5:36/km"
export function formatPace(durasiDetik, jarakKm) {
  if (!jarakKm || jarakKm <= 0) return '-';
  const detikPerKm = durasiDetik / jarakKm;
  const menit = Math.floor(detikPerKm / 60);
  const detik = Math.round(detikPerKm % 60);
  return `${menit}:${String(detik).padStart(2, '0')}/km`;
}
