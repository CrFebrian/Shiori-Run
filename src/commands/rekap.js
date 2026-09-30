import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getRekapBulan } from '../db.js';
import { formatDurasi, formatPace } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('rekap')
  .setDescription('Lihat rekap lari bulanan')
  .addStringOption(o => o.setName('bulan').setDescription('Format YYYY-MM, default bulan ini').setRequired(false));

export async function execute(interaction) {
  const bulanRaw = interaction.options.getString('bulan');
  const bulan = bulanRaw || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    return interaction.reply({
      content: '❌ Format bulan harus `YYYY-MM`, contoh: `2026-09`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rekap = getRekapBulan(interaction.user.id, bulan);

  if (rekap.jumlahLari === 0) {
    return interaction.reply({ content: `Belum ada catatan lari di bulan \`${bulan}\`.` });
  }

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`📊 Rekap Lari — ${bulan}`)
    .addFields(
      { name: 'Total jarak', value: `${rekap.totalJarak.toFixed(2)} km`, inline: true },
      { name: 'Jumlah lari', value: `${rekap.jumlahLari}x`, inline: true },
      { name: 'Total waktu', value: formatDurasi(rekap.totalDurasi), inline: true },
      { name: 'Rata-rata pace', value: formatPace(rekap.totalDurasi, rekap.totalJarak), inline: true },
      { name: 'Jarak terjauh', value: `${rekap.jarakTerjauh.toFixed(2)} km`, inline: true },
    );

  if (rekap.rataDetakJantung) {
    embed.addFields({ name: 'Rata-rata detak jantung', value: `${rekap.rataDetakJantung} bpm`, inline: true });
  }
  if (rekap.totalElevasi > 0) {
    embed.addFields({ name: 'Total elevasi', value: `${rekap.totalElevasi.toFixed(0)} m`, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}
