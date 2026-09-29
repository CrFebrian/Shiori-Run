import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { upsertBuddyPref, getBuddyPref, deleteBuddyPref, listOtherBuddyPrefs } from '../db.js';
import { geocode } from '../geocode.js';
import { parseJam, formatJam, parseDurasi, formatPacePerKm, haversineKm } from '../utils.js';

// Toleransi matching — sengaja fixed dulu, gampang diubah kalau kerasa kurang pas
const TOLERANSI_JAM_MENIT = 60;   // ±1 jam dari jam yang kamu set masih dianggap cocok
const TOLERANSI_PACE_DETIK = 30;  // ±30 detik/km dari pace target masih dianggap cocok

export const data = new SlashCommandBuilder()
  .setName('lari-buddy')
  .setDescription('Cari teman lari berdasarkan jam, lokasi, dan pace')
  .addSubcommand(sub => sub
    .setName('set')
    .setDescription('Atur/update preferensi lari kamu')
    .addStringOption(o => o.setName('jam').setDescription('Jam biasa lari, format HH:MM (contoh 06:00)').setRequired(true))
    .addStringOption(o => o.setName('lokasi').setDescription('Nama tempat, contoh: Alun-alun Pamekasan').setRequired(true))
    .addStringOption(o => o.setName('pace').setDescription('Target pace, format mm:ss per km (contoh 5:30)').setRequired(true))
    .addNumberOption(o => o.setName('radius').setDescription('Radius toleransi jarak lokasi, km (default 5)').setRequired(false)))
  .addSubcommand(sub => sub.setName('cari').setDescription('Cari teman lari yang cocok sama preferensi kamu'))
  .addSubcommand(sub => sub.setName('lihat').setDescription('Lihat preferensi lari kamu saat ini'))
  .addSubcommand(sub => sub.setName('hapus').setDescription('Hapus preferensi lari kamu'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'set') return handleSet(interaction);
  if (sub === 'cari') return handleCari(interaction);
  if (sub === 'lihat') return handleLihat(interaction);
  if (sub === 'hapus') return handleHapus(interaction);
}

async function handleSet(interaction) {
  const jamRaw = interaction.options.getString('jam');
  const lokasiRaw = interaction.options.getString('lokasi');
  const paceRaw = interaction.options.getString('pace');
  const radiusKm = interaction.options.getNumber('radius') ?? 5;

  const jamMenit = parseJam(jamRaw);
  if (jamMenit === null) {
    return interaction.reply({ content: '❌ Format jam harus `HH:MM`, contoh: `06:00`.', flags: MessageFlags.Ephemeral });
  }

  const paceDetik = parseDurasi(paceRaw); // format mm:ss sama kayak durasi lari
  if (paceDetik === null || paceDetik <= 0) {
    return interaction.reply({ content: '❌ Format pace harus `mm:ss`, contoh: `5:30`.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  let lokasi;
  try {
    lokasi = await geocode(lokasiRaw);
  } catch (err) {
    console.error('[lari-buddy] geocode error:', err);
    return interaction.editReply('❌ Gagal menghubungi layanan peta. Coba lagi sebentar lagi.');
  }

  if (!lokasi) {
    return interaction.editReply(
      `❌ Lokasi \`${lokasiRaw}\` tidak ditemukan. Coba nama yang lebih spesifik (tambahin nama kota/kabupaten).`
    );
  }

  upsertBuddyPref({
    userId: interaction.user.id,
    jamMenit,
    lokasiNama: lokasi.displayName,
    lat: lokasi.lat,
    lon: lokasi.lon,
    radiusKm,
    paceDetik,
  });

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('✅ Preferensi lari disimpan')
    .addFields(
      { name: 'Jam', value: formatJam(jamMenit), inline: true },
      { name: 'Pace target', value: formatPacePerKm(paceDetik), inline: true },
      { name: 'Radius toleransi', value: `${radiusKm} km`, inline: true },
      { name: 'Lokasi', value: lokasi.displayName },
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleCari(interaction) {
  const myPref = getBuddyPref(interaction.user.id);
  if (!myPref) {
    return interaction.reply({ content: '⚠️ Kamu belum set preferensi. Pakai `/lari-buddy set` dulu.', flags: MessageFlags.Ephemeral });
  }

  const matches = listOtherBuddyPrefs(interaction.user.id)
    .map(o => ({ ...o, jarakKm: haversineKm(myPref.lat, myPref.lon, o.lat, o.lon) }))
    .filter(o =>
      Math.abs(o.jam_menit - myPref.jam_menit) <= TOLERANSI_JAM_MENIT &&
      Math.abs(o.pace_detik - myPref.pace_detik) <= TOLERANSI_PACE_DETIK &&
      o.jarakKm <= Math.max(o.radius_km, myPref.radius_km)
    )
    .sort((a, b) => a.jarakKm - b.jarakKm)
    .slice(0, 5);

  if (matches.length === 0) {
    return interaction.reply('Belum ada yang cocok sama preferensi kamu saat ini. Coba lagi kalau ada temen lain yang udah `/lari-buddy set`.');
  }

  const lines = matches.map(m =>
    `<@${m.user_id}> — ${formatJam(m.jam_menit)}, ${m.lokasi_nama.split(',')[0]} (~${m.jarakKm.toFixed(1)} km dari lokasi kamu), pace ${formatPacePerKm(m.pace_detik)}`
  );

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('🏃‍♂️ Teman lari yang cocok')
    .setDescription(lines.join('\n'));

  await interaction.reply({ embeds: [embed] });
}

async function handleLihat(interaction) {
  const pref = getBuddyPref(interaction.user.id);
  if (!pref) {
    return interaction.reply({ content: 'Kamu belum set preferensi lari.', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('Preferensi lari kamu')
    .addFields(
      { name: 'Jam', value: formatJam(pref.jam_menit), inline: true },
      { name: 'Pace target', value: formatPacePerKm(pref.pace_detik), inline: true },
      { name: 'Radius', value: `${pref.radius_km} km`, inline: true },
      { name: 'Lokasi', value: pref.lokasi_nama },
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleHapus(interaction) {
  const ok = deleteBuddyPref(interaction.user.id);
  await interaction.reply({
    content: ok ? '🗑️ Preferensi lari kamu sudah dihapus.' : 'Kamu belum punya preferensi tersimpan.',
    flags: MessageFlags.Ephemeral,
  });
}
