import {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ComponentType, MessageFlags,
} from 'discord.js';
import { insertRun } from '../db.js';
import { formatDurasi, formatPace } from '../utils.js';

const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export const data = new SlashCommandBuilder()
  .setName('lari-foto')
  .setDescription('Catat lari dari screenshot recap (Fitbeing, Strava, dll)')
  .addAttachmentOption(o => o.setName('foto').setDescription('Screenshot recap lari').setRequired(true))
  .addStringOption(o => o.setName('tanggal').setDescription('YYYY-MM-DD, override tanggal kalau salah dibaca dari foto').setRequired(false));

export async function execute(interaction) {
  const foto = interaction.options.getAttachment('foto');
  const tanggalOverride = interaction.options.getString('tanggal');

  if (!foto.contentType?.startsWith('image/')) {
    return interaction.reply({ content: '❌ File yang diupload harus gambar (screenshot).', flags: MessageFlags.Ephemeral });
  }
  if (tanggalOverride && !/^\d{4}-\d{2}-\d{2}$/.test(tanggalOverride)) {
    return interaction.reply({ content: '❌ Format tanggal harus `YYYY-MM-DD`.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply();

  let hasil;
  try {
    hasil = await extractRunFromImage(foto.url);
  } catch (err) {
    console.error('[lari-foto] extract error:', err);
    return interaction.editReply('❌ Gagal membaca gambar (server vision AI bermasalah). Coba lagi, atau catat manual pakai `/lari`.');
  }

  if (hasil.jarakKm === null || hasil.durasiDetik === null) {
    return interaction.editReply('❌ Nggak berhasil nemuin jarak/durasi di gambar ini. Coba screenshot yang lebih jelas, atau catat manual pakai `/lari`.');
  }

  const jarakKm = hasil.jarakKm;
  const durasiDetik = hasil.durasiDetik;
  const tanggal = tanggalOverride || hasil.tanggal || new Date().toISOString().slice(0, 10);

  const previewEmbed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🔍 Hasil baca gambar — cek dulu sebelum disimpan')
    .addFields(
      { name: 'Jarak', value: `${jarakKm.toFixed(2)} km`, inline: true },
      { name: 'Waktu', value: formatDurasi(durasiDetik), inline: true },
      { name: 'Pace', value: formatPace(durasiDetik, jarakKm), inline: true },
      { name: 'Tanggal', value: tanggal, inline: true },
    )
    .setThumbnail(foto.url)
    .setFooter({ text: 'Vision AI kadang salah baca angka — pastikan bener dulu, ya' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lari-foto-simpan').setLabel('Simpan').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('lari-foto-batal').setLabel('Batal').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );

  const reply = await interaction.editReply({ embeds: [previewEmbed], components: [row] });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: i => i.user.id === interaction.user.id,
  });

  collector.on('collect', async i => {
    if (i.customId === 'lari-foto-simpan') {
      const { id } = insertRun({ userId: interaction.user.id, jarakKm, durasiDetik, tanggal });
      previewEmbed
        .setTitle('🏃 Lari tersimpan!')
        .setColor(0x2ecc71)
        .setFooter({ text: `ID #${id} — pakai /hapus id:${id} kalau ternyata masih salah` });
    } else {
      previewEmbed.setTitle('❌ Dibatalkan, tidak disimpan').setColor(0x95a5a6).setFooter(null);
    }
    await i.update({ embeds: [previewEmbed], components: [] });
    collector.stop();
  });

  collector.on('end', async collected => {
    if (collected.size === 0) {
      previewEmbed.setFooter({ text: 'Waktu konfirmasi habis, data tidak disimpan.' });
      await interaction.editReply({ embeds: [previewEmbed], components: [] }).catch(() => {});
    }
  });
}

async function extractRunFromImage(imageUrl) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'Kamu meng-ekstrak data lari dari screenshot app fitness (Strava, Fitbeing, Garmin, dll). ' +
            'Balas HANYA JSON, tanpa teks lain, dengan schema persis: ' +
            '{"jarak_km": number|null, "durasi_detik": number|null, "tanggal": "YYYY-MM-DD"|null}. ' +
            'jarak_km = total jarak dalam kilometer (konversi kalau satuan aslinya meter/mil). ' +
            'durasi_detik = total durasi lari dalam detik (konversi dari format jam/menit/detik yang tertulis). ' +
            'tanggal = tanggal sesi lari kalau tertulis di gambar (format YYYY-MM-DD), kalau tidak ada isi null. ' +
            'Ambil angka RINGKASAN TOTAL sesi (bukan angka per-kilometer/split/pace sesaat).',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Ekstrak data lari dari gambar ini.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');

  return {
    jarakKm: typeof parsed.jarak_km === 'number' ? parsed.jarak_km : null,
    durasiDetik: typeof parsed.durasi_detik === 'number' ? Math.round(parsed.durasi_detik) : null,
    tanggal: typeof parsed.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.tanggal) ? parsed.tanggal : null,
  };
}
