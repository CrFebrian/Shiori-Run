// Geocoding gratis pakai OpenStreetMap Nominatim (nggak perlu API key).
// Usage policy Nominatim: maks 1 request/detik & wajib User-Agent yang jelas.
// Ini cuma dipanggil sekali tiap user pakai `/lari-buddy set`, jadi jauh di
// bawah limit itu — aman buat penggunaan personal.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocode(query) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      // Ganti bagian kontak sesuai kamu — Nominatim mewajibkan User-Agent
      // yang bisa diidentifikasi, bukan default library.
      'User-Agent': 'lari-bot/1.0 (personal Discord bot)',
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim error: ${res.status}`);
  }

  const results = await res.json();
  if (!results.length) return null;

  const { lat, lon, display_name } = results[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), displayName: display_name };
}
