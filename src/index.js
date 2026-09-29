import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, MessageFlags, REST, Routes } from 'discord.js';
import { readdir } from 'fs/promises';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// ── Load semua command dari src/commands/*.js ────────────────────────────────
const commandsDir = path.join(__dirname, 'commands');
const commandFiles = await readdir(commandsDir);

for (const file of commandFiles.filter(f => f.endsWith('.js'))) {
  const filePath = pathToFileURL(path.join(commandsDir, file)).href;
  const command = await import(filePath);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`[bot] Loaded command: /${command.data.name}`);
  }
}

// ── Register slash command ke satu guild (instan, cocok buat bot personal) ──
async function registerCommands() {
  const body = client.commands.map(c => c.data.toJSON());
  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body }
    );
    console.log(`✅ Registered ${body.length} command(s) ke guild ${process.env.GUILD_ID} (instan)`);
  } else {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
    console.log(`✅ Registered ${body.length} command(s) global (propagasi bisa sampai 1 jam)`);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot ${client.user.tag} online!`);
  try {
    await registerCommands();
  } catch (err) {
    console.error('[bot] Gagal register command:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({
      content: '⚠️ Command ini baru saja berubah. Refresh Discord (Ctrl+R) biar cache-nya update.',
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[bot] Error di /${interaction.commandName}:`, err);
    const msg = { content: '❌ Terjadi kesalahan saat menjalankan command.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
