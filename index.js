import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { createSession, login, detectNewTasks } from "./src/services/elnino_scraper.js";
import { classMapping } from "./src/services/class_mapping.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", async () => {
  console.log(`Bot ${client.user.tag} siap!`);

  const sentTasks = new Set();

  for (const [className, config] of Object.entries(classMapping)) {
    console.log(`[INFO] Memulai scraping untuk kelas ${className}...`);

    if (!config.matkul || typeof config.matkul !== "object") {
      console.error(`[ERROR] Data matkul tidak valid untuk kelas ${className}.`);
      continue;
    }

    try {
      const session = await createSession();
      const cookies = await login(session, config.username, config.password);
      if (!cookies) {
        console.error(`[ERROR] Gagal login untuk kelas ${className}`);
        continue;
      }

      for (const [courseName, courseUrl] of Object.entries(config.matkul)) {
        console.log(`[INFO] Memeriksa tugas baru untuk ${courseName}`);
        await detectNewTasks(courseUrl, session, sentTasks, client, config.channel, config.id);
      }
    } catch (error) {
      console.error(`[ERROR] Kesalahan saat memproses kelas ${className}: ${error.message}`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
