import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { listRuns } from '../db.js';
import { formatDurasi, formatPace } from '../utils.js';

export const data = new SlashCommandBuilder()
  .setName('riwayat')
  .setDescription('Lihat catatan lari terakhir')
  .addIntegerOption(o =>
    o.setName('jumlah').setDescription('Berapa catatan terakhir (default 10, maks 25)').setRequired(false)
  );

export async function execute(interaction) {
  const jumlah = Math.min(Math.max(interaction.options.getInteger('jumlah') || 10, 1), 25);
  const runs = listRuns(interaction.user.id, jumlah);

  if (runs.length === 0) {
    return interaction.reply({ content: 'Belum ada catatan lari sama sekali. Coba `/lari` dulu.' });
  }

  const lines = runs.map(r =>
    `\`#${r.id}\` **${r.tanggal}** — ${r.jarakKm.toFixed(2)} km, ${formatDurasi(r.durasiDetik)} (${formatPace(r.durasiDetik, r.jarakKm)})`
  );

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🗒️ Riwayat lari (${runs.length} terakhir)`)
    .setDescription(lines.join('\n'));

  await interaction.reply({ embeds: [embed] });
}
