import { kv } from '@vercel/kv';
import { getSessionIdFromReq, clearSessionCookie } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const sessionId = getSessionIdFromReq(req);
    if (sessionId) {
      await kv.del(`session:${sessionId}`);
    }
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('logout.js error:', err);
    clearSessionCookie(res);
    res.status(200).json({ ok: true });
  }
}
