import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { insertRun } from '../db.js';
import { parseJarak, parseDurasi, formatDurasi, formatPace } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('lari')
  .setDescription('Catat sesi lari')
  .addStringOption(o => o.setName('jarak').setDescription('Contoh: 5km, 5.2km, 5000m').setRequired(true))
  .addStringOption(o => o.setName('waktu').setDescription('Contoh: 28menit, 1jam30menit, 28:00').setRequired(true))
  .addStringOption(o => o.setName('tanggal').setDescription('YYYY-MM-DD, default hari ini').setRequired(false));

export async function execute(interaction) {
  const jarakRaw = interaction.options.getString('jarak');
  const waktuRaw = interaction.options.getString('waktu');
  const tanggalRaw = interaction.options.getString('tanggal');

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

  const { id } = insertRun({ userId: interaction.user.id, jarakKm, durasiDetik, tanggal });

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🏃 Lari tercatat!')
    .addFields(
      { name: 'Jarak', value: `${jarakKm.toFixed(2)} km`, inline: true },
      { name: 'Waktu', value: formatDurasi(durasiDetik), inline: true },
      { name: 'Pace', value: formatPace(durasiDetik, jarakKm), inline: true },
      { name: 'Tanggal', value: tanggal, inline: true },
    )
    .setFooter({ text: `ID #${id} — pakai /hapus id:${id} kalau salah input` });

  await interaction.reply({ embeds: [embed] });
}
