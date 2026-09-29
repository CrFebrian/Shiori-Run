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
  return formatPacePerKm(durasiDetik / jarakKm);
}

// detikPerKm=336 → "5:36/km" (dipakai saat pace sudah dalam bentuk detik/km, kayak di buddy finder)
export function formatPacePerKm(detikPerKm) {
  const menit = Math.floor(detikPerKm / 60);
  const detik = Math.round(detikPerKm % 60);
  return `${menit}:${String(detik).padStart(2, '0')}/km`;
}

// "06:00", "6:00" → menit sejak 00:00 (360). null kalau format salah.
export function parseJam(raw) {
  const m = String(raw).trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// 360 → "06:00"
export function formatJam(menitSejakTengahMalam) {
  const j = Math.floor(menitSejakTengahMalam / 60);
  const m = menitSejakTengahMalam % 60;
  return `${String(j).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Jarak antara 2 titik koordinat bumi (km), rumus Haversine — dipakai buat
// matching Buddy Finder, murni matematika, nggak butuh API peta apapun.
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius bumi, km
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
