import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const update = req.body;
  try {
    const message = update.message;
    const text = message?.text || '';
    const chatId = message?.chat?.id;

    if (text === '/start') {
      await sendMsg(BOT_TOKEN, chatId,
        'Привет!\n' + 
        '🏍 Это команда MotoSport.\n' +
        'Рады видеть тебя в Telegram Bot "MotoSport Monitoring"\n\n' +
        'Доступные команды:\n' +
        '/last - Показывает последних 5 пользователей заходвших на сайт\n' +
        '/topip - Показывает IP наиболее часто заходивших на сайт'
      );
    } else if (text === '/last') {
      await sendLastVisits(BOT_TOKEN, chatId);
    } else if (text.toLowerCase() === '/topip') {
      await sendTopIps(BOT_TOKEN, chatId);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('webhook error:', err);
    res.status(200).json({ ok: true });
  }
}

async function sendLastVisits(BOT_TOKEN, chatId) {
  const visits = await kv.lrange('visits', 0, 4);
  if (!visits.length) {
    await sendMsg(BOT_TOKEN, chatId, 'Пока нет данных о визитах.');
    return;
  }
  let text = '📄 *Последние 5 визитов:*\n\n';
  visits.forEach((v, i) => {
    const visit = typeof v === 'string' ? JSON.parse(v) : v;
    const date = new Date(visit.time).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
    });
    text += `${i + 1}. \`${visit.ip}\` — ${visit.location}\n📄 ${visit.page} · 🕒 ${date}\n\n`;
  });
  await sendMsg(BOT_TOKEN, chatId, text);
}

async function sendTopIps(BOT_TOKEN, chatId) {
  const counts = await kv.hgetall('ip_counts');
  if (!counts || !Object.keys(counts).length) {
    await sendMsg(BOT_TOKEN, chatId, 'Пока нет данных.');
    return;
  }
  const locations = (await kv.hgetall('ip_locations')) || {};
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let text = '🌍 *Топ IP по количеству визитов:*\n\n';
  sorted.forEach(([ip, count], i) => {
    text += `${i + 1}. \`${ip}\` — ${count} раз(а)\n   ${locations[ip] || 'неизвестно'}\n\n`;
  });
  await sendMsg(BOT_TOKEN, chatId, text);
}

async function sendMsg(BOT_TOKEN, chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}
