import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { insertRun } from '../db.js';
import { parseJarak, parseDurasi, parseElevasi, parseZona, formatDurasi, formatPace } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('lari')
  .setDescription('Catat sesi lari')
  .addStringOption(o => o.setName('jarak').setDescription('Contoh: 5km, 5.2km, 5000m').setRequired(true))
  .addStringOption(o => o.setName('waktu').setDescription('Contoh: 28menit, 1jam30menit, 28:00').setRequired(true))
  .addStringOption(o => o.setName('tanggal').setDescription('YYYY-MM-DD, default hari ini').setRequired(false))
  .addIntegerOption(o => o.setName('detak_jantung').setDescription('Rata-rata detak jantung, bpm').setRequired(false))
  .addStringOption(o => o.setName('elevasi').setDescription('Elevation gain, contoh: 25m').setRequired(false))
  .addStringOption(o => o.setName('zona').setDescription('Zona detak jantung dominan, contoh: Zona 4').setRequired(false));

export async function execute(interaction) {
  const jarakRaw = interaction.options.getString('jarak');
  const waktuRaw = interaction.options.getString('waktu');
  const tanggalRaw = interaction.options.getString('tanggal');
  const detakJantung = interaction.options.getInteger('detak_jantung');
  const elevasiRaw = interaction.options.getString('elevasi');
  const zonaRaw = interaction.options.getString('zona');

  const jarakKm = parseJarak(jarakRaw);
  if (jarakKm === null || jarakKm <= 0) {
    return interaction.reply({
      content: `❌ Format jarak tidak dikenali: \`${jarakRaw}\`. Contoh: \`5km\`, \`5.2km\`, \`5000m\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const durasiDetik = parseDurasi(waktuRaw);
  if (durasiDetik === null || durasiDetik <= 0) {
    return interaction.reply({
      content: `❌ Format waktu tidak dikenali: \`${waktuRaw}\`. Contoh: \`28menit\`, \`1jam30menit\`, \`28:00\`.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  let tanggal = new Date().toISOString().slice(0, 10);
  if (tanggalRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalRaw)) {
      return interaction.reply({
        content: '❌ Format tanggal harus `YYYY-MM-DD`, contoh: `2026-09-28`.',
        flags: MessageFlags.Ephemeral,
      });
    }
    tanggal = tanggalRaw;
  }

  let elevasiM = null;
  if (elevasiRaw) {
    elevasiM = parseElevasi(elevasiRaw);
    if (elevasiM === null) {
      return interaction.reply({
        content: `❌ Format elevasi tidak dikenali: \`${elevasiRaw}\`. Contoh: \`25m\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  let zonaDominan = null;
  if (zonaRaw) {
    zonaDominan = parseZona(zonaRaw);
    if (zonaDominan === null) {
      return interaction.reply({
        content: `❌ Format zona tidak dikenali: \`${zonaRaw}\`. Contoh: \`Zona 4\` atau \`4\` (1-5).`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  const { id } = insertRun({
    userId: interaction.user.id, jarakKm, durasiDetik, tanggal,
    detakJantung, elevasiM, zonaDominan,
  });

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🏃 Lari tercatat!')
    .addFields(
      { name: 'Jarak', value: `${jarakKm.toFixed(2)} km`, inline: true },
      { name: 'Waktu', value: formatDurasi(durasiDetik), inline: true },
      { name: 'Pace', value: formatPace(durasiDetik, jarakKm), inline: true },
      { name: 'Tanggal', value: tanggal, inline: true },
    );

  if (detakJantung) embed.addFields({ name: 'Detak jantung', value: `${detakJantung} bpm`, inline: true });
  if (elevasiM !== null) embed.addFields({ name: 'Elevasi', value: `${elevasiM} m`, inline: true });
  if (zonaDominan) embed.addFields({ name: 'Zona', value: zonaDominan, inline: true });

  embed.setFooter({ text: `ID #${id} — pakai /revisi id:${id} kalau ada yang salah` });

  await interaction.reply({ embeds: [embed] });
}
