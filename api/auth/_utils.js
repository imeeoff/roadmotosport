import crypto from 'crypto';

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function makeSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

export function setSessionCookie(res, sessionId) {
  const maxAge = 60 * 60 * 24 * 30; // 30 дней
  res.setHeader(
    'Set-Cookie',
    `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export function getSessionIdFromReq(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}
