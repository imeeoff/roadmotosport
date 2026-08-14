import { kv } from '@vercel/kv';
import { getSessionIdFromReq } from './_utils.js';

export default async function handler(req, res) {
  try {
    const sessionId = getSessionIdFromReq(req);
    if (!sessionId) {
      return res.status(200).json({ ok: true, user: null });
    }

    const email = await kv.get(`session:${sessionId}`);
    if (!email) {
      return res.status(200).json({ ok: true, user: null });
    }

    const user = await kv.get(`user:${email}`);
    if (!user) {
      return res.status(200).json({ ok: true, user: null });
    }

    res.status(200).json({ ok: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('me.js error:', err);
    res.status(200).json({ ok: true, user: null });
  }
}
