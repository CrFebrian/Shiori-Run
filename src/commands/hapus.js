import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { deleteRun } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('hapus')
  .setDescription('Hapus catatan lari (kalau salah input)')
  .addIntegerOption(o => o.setName('id').setDescription('ID catatan, lihat dari /riwayat').setRequired(true));

export async function execute(interaction) {
  const id = interaction.options.getInteger('id');
  const ok = deleteRun(id, interaction.user.id);

  if (!ok) {
    return interaction.reply({
      content: `❌ Catatan \`#${id}\` tidak ditemukan (atau bukan punya kamu).`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({ content: `🗑️ Catatan \`#${id}\` sudah dihapus.` });
}
