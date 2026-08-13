import { kv } from '@vercel/kv';

const ALLOWED_ORIGIN = 'https://motosport-8ahd.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin.startsWith(ALLOWED_ORIGIN)) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в переменных окружения Vercel');
    res.status(200).json({ ok: false });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};
    const page = body.page || 'неизвестно';
    const referrer = body.referrer && body.referrer.trim() ? body.referrer : 'напрямую / без перехода';
    const lang = body.lang || 'неизвестно';
    const screen = body.screen || 'неизвестно';

    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'неизвестно';
    const userAgent = req.headers['user-agent'] || 'неизвестно';

    let location = 'не удалось определить';
    if (ip && ip !== 'неизвестно' && !ip.startsWith('127.') && !ip.startsWith('::1')) {
      try {
        const geoResp = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoResp.ok) {
          const geo = await geoResp.json();
          if (!geo.error) {
            const parts = [geo.city, geo.region, geo.country_name].filter(Boolean);
            location = parts.length ? parts.join(', ') : 'не удалось определить';
            if (geo.org) location += ` — ${geo.org}`;
          }
        }
      } catch (e) {
        console.error('Geo lookup error:', e);
      }
    }

    const time = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'short',
      timeStyle: 'medium',
    });

    const text =
      `🏍 Новый визит на MotoSport\n\n` +
      `📄 Страница: ${page}\n` +
      `🔗 Переход: ${referrer}\n` +
      `🌍 Локация: ${location}\n` +
      `📍 IP: ${ip}\n` +
      `💻 Устройство: ${userAgent}\n` +
      `🌐 Язык: ${lang} · Экран: ${screen}\n` +
      `🕒 Время (МСК): ${time}`;

     const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
    });
   if (!tgResp.ok) {
      const errText = await tgResp.text();
      console.error('Telegram sendMessage error:', tgResp.status, errText);
}

    const visit = {
      ip,
      location,
      page,
      referrer,
      userAgent,
      time: new Date().toISOString(),
    };
    await kv.lpush('visits', JSON.stringify(visit));
    await kv.ltrim('visits', 0, 199);
    await kv.hincrby('ip_counts', ip, 1);
    await kv.hset('ip_locations', { [ip]: location });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track.js error:', err);
    res.status(200).json({ ok: false });
  }
}
