import { kv } from '@vercel/kv';
import { hashPassword, makeSessionId, setSessionCookie } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Укажите email и пароль' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await kv.get(`user:${normalizedEmail}`);

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Неверный email или пароль' });
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(401).json({ ok: false, error: 'Неверный email или пароль' });
    }

    const sessionId = makeSessionId();
    await kv.set(`session:${sessionId}`, normalizedEmail, { ex: 60 * 60 * 24 * 30 });

    setSessionCookie(res, sessionId);
    res.status(200).json({ ok: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('login.js error:', err);
    res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
  }
}
