import { kv } from '@vercel/kv';
import crypto from 'crypto';
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
    const { name, email, password, phone } = body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: 'Укажите имя' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Введите корректный email' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Пароль должен быть не короче 8 символов' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = `user:${normalizedEmail}`;

    const existing = await kv.get(emailKey);
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Пользователь с таким email уже существует' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const user = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      salt,
      passwordHash,
      createdAt: Date.now(),
    };

    await kv.set(emailKey, user);

    const sessionId = makeSessionId();
    await kv.set(`session:${sessionId}`, normalizedEmail, { ex: 60 * 60 * 24 * 30 });

    setSessionCookie(res, sessionId);
    res.status(200).json({ ok: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('register.js error:', err);
    res.status(500).json({ ok: false, error: 'Внутренняя ошибка сервера' });
  }
}
