import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getRunById, updateRun } from '../db.js';
import { parseJarak, parseDurasi, parseElevasi, parseZona, formatDurasi, formatPace } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('revisi')
  .setDescription('Edit catatan lari yang sudah ada (isi cuma field yang mau diubah)')
  .addIntegerOption(o => o.setName('id').setDescription('ID catatan, lihat dari /riwayat').setRequired(true))
  .addStringOption(o => o.setName('jarak').setDescription('Jarak baru, contoh: 5.2km').setRequired(false))
  .addStringOption(o => o.setName('waktu').setDescription('Waktu baru, contoh: 29menit').setRequired(false))
  .addStringOption(o => o.setName('tanggal').setDescription('Tanggal baru, YYYY-MM-DD').setRequired(false))
  .addIntegerOption(o => o.setName('detak_jantung').setDescription('Detak jantung baru, bpm').setRequired(false))
  .addStringOption(o => o.setName('elevasi').setDescription('Elevasi baru, contoh: 25m').setRequired(false))
  .addStringOption(o => o.setName('zona').setDescription('Zona baru, contoh: Zona 4').setRequired(false));

export async function execute(interaction) {
  const id = interaction.options.getInteger('id');
  const run = getRunById(id, interaction.user.id);

  if (!run) {
    return interaction.reply({
      content: `❌ Catatan \`#${id}\` tidak ditemukan (atau bukan punya kamu).`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const jarakRaw = interaction.options.getString('jarak');
  const waktuRaw = interaction.options.getString('waktu');
  const tanggalRaw = interaction.options.getString('tanggal');
  const detakJantung = interaction.options.getInteger('detak_jantung');
  const elevasiRaw = interaction.options.getString('elevasi');
  const zonaRaw = interaction.options.getString('zona');

  const patch = {};

  if (jarakRaw !== null) {
    const jarakKm = parseJarak(jarakRaw);
    if (jarakKm === null || jarakKm <= 0) {
      return interaction.reply({ content: `❌ Format jarak tidak dikenali: \`${jarakRaw}\`.`, flags: MessageFlags.Ephemeral });
    }
    patch.jarakKm = jarakKm;
  }

  if (waktuRaw !== null) {
    const durasiDetik = parseDurasi(waktuRaw);
    if (durasiDetik === null || durasiDetik <= 0) {
      return interaction.reply({ content: `❌ Format waktu tidak dikenali: \`${waktuRaw}\`.`, flags: MessageFlags.Ephemeral });
    }
    patch.durasiDetik = durasiDetik;
  }

  if (tanggalRaw !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalRaw)) {
      return interaction.reply({ content: '❌ Format tanggal harus `YYYY-MM-DD`.', flags: MessageFlags.Ephemeral });
    }
    patch.tanggal = tanggalRaw;
  }

  if (detakJantung !== null) patch.detakJantung = detakJantung;

  if (elevasiRaw !== null) {
    const elevasiM = parseElevasi(elevasiRaw);
    if (elevasiM === null) {
      return interaction.reply({ content: `❌ Format elevasi tidak dikenali: \`${elevasiRaw}\`.`, flags: MessageFlags.Ephemeral });
    }
    patch.elevasiM = elevasiM;
  }

  if (zonaRaw !== null) {
    const zonaDominan = parseZona(zonaRaw);
    if (zonaDominan === null) {
      return interaction.reply({ content: `❌ Format zona tidak dikenali: \`${zonaRaw}\`. Contoh: \`Zona 4\` atau \`4\`.`, flags: MessageFlags.Ephemeral });
    }
    patch.zonaDominan = zonaDominan;
  }

  if (Object.keys(patch).length === 0) {
    return interaction.reply({
      content: '⚠️ Nggak ada yang mau diubah. Isi minimal satu field (jarak/waktu/tanggal/detak_jantung/elevasi/zona).',
      flags: MessageFlags.Ephemeral,
    });
  }

  updateRun(id, interaction.user.id, patch);
  const updated = getRunById(id, interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`✏️ Catatan #${id} diperbarui`)
    .addFields(
      { name: 'Jarak', value: `${updated.jarak_km.toFixed(2)} km`, inline: true },
      { name: 'Waktu', value: formatDurasi(updated.durasi_detik), inline: true },
      { name: 'Pace', value: formatPace(updated.durasi_detik, updated.jarak_km), inline: true },
      { name: 'Tanggal', value: updated.tanggal, inline: true },
    );

  if (updated.detak_jantung_avg) embed.addFields({ name: 'Detak jantung', value: `${updated.detak_jantung_avg} bpm`, inline: true });
  if (updated.elevasi_m !== null) embed.addFields({ name: 'Elevasi', value: `${updated.elevasi_m} m`, inline: true });
  if (updated.zona_dominan) embed.addFields({ name: 'Zona', value: updated.zona_dominan, inline: true });

  await interaction.reply({ embeds: [embed] });
}
