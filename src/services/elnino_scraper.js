import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";

const LOGIN_URL = "https://elnino20212.polines.ac.id/login/index.php";

export async function createSession() {
  const jar = new CookieJar();
  return wrapper(axios.create({ jar }));
}

export async function login(session, username, password) {
  try {
    console.log(`[INFO] Memulai proses login untuk username: ${username}`);
    const loginPage = await session.get(LOGIN_URL);
    const $ = cheerio.load(loginPage.data);
    const token = $('input[name="logintoken"]').val();

    if (!token) {
      throw new Error("Gagal mendapatkan token login.");
    }

    console.log(`[DEBUG] Token login: ${token}`);
    const payload = new URLSearchParams({
      logintoken: token,
      username,
      password,
      anchor: "#",
    });

    const response = await session.post(LOGIN_URL, payload.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        Referer: LOGIN_URL,
      },
    });

    if (response.data.includes("Dasbor")) {
      console.log(`[INFO] Login berhasil untuk username: ${username}`);
      return session;
    } else {
      console.error(`[ERROR] Login gagal untuk username: ${username}`);
      return null;
    }
  } catch (error) {
    console.error(`[ERROR] Kesalahan saat login: ${error.message}`);
    return null;
  }
}

async function scrapeTasks(session, courseUrl) {
  try {
    const response = await session.get(courseUrl);
    const $ = cheerio.load(response.data);
    const tasks = [];

    $("li.activity.assign.modtype_assign").each((_, el) => {
      const taskName = $(el).find("span.instancename").text().trim();
      const taskUrl = $(el).find("a").attr("href");

      if (taskName && taskUrl) {
        tasks.push({ name: taskName, url: taskUrl });
      }
    });

    return tasks;
  } catch (error) {
    console.error(
      `[ERROR] Gagal scraping tugas dari ${courseUrl}: ${error.message}`
    );
    return [];
  }
}

export async function detectNewTasks(
  courseUrl,
  session,
  sentTasks,
  bot,
  channelId,
  roleId
) {
  try {
    const tasks = await scrapeTasks(session, courseUrl);

    for (const task of tasks) {
      if (!sentTasks.has(task.url)) {
        const channel = bot.channels.cache.get(channelId);
        if (channel) {
          const message = `🔔 **Tugas Baru!** <@&${roleId}>\n${task.name} (${task.course})\n📎 ${task.url}`;
          await channel.send(message);
        }
        sentTasks.add(task.url);
      }
    }
  } catch (error) {
    console.error(
      `[ERROR] Kesalahan saat mendeteksi tugas baru: ${error.message}`
    );
  }
}
