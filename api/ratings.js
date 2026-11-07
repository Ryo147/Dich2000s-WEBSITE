// Một hàm duy nhất cho toàn bộ hệ thống đánh giá (giữ trong giới hạn số hàm của gói Hobby).
// GET  ?game=<slug> | ?featured=1 | ?me=1
// POST {action: rate|login|logout|me|delete-account|remove-device|reset-devices|rotate-request|rotate-cancel|rotate-finish|rotate-mail-request|rotate-mail-activate|rotate-mail-cancel|set-email|verify-email|remove-email|admin-reset-code|report|admin-reports|admin-remove|admin-restore, ...}
import crypto from 'node:crypto';
import * as core from '../lib/ratings-core.js';
import { redisStore } from '../lib/redis-store.js';
import { makeMailer } from '../lib/mailer.js';

const ALLOWED_ORIGINS = ['https://dich2000s.vercel.app'];
const COOKIE = 'd2k_sess';
// Cookie sống lâu; hạn thật của phiên (21 ngày không dùng) do server quyết định và gia hạn khi dùng
const COOKIE_SECONDS = 365 * 24 * 60 * 60;

const secret = () => process.env.AUTH_SECRET;
const clientIp = (req) => {
  const f = req.headers['x-forwarded-for'];
  return (typeof f === 'string' && f.split(',')[0].trim()) || (req.socket && req.socket.remoteAddress) || 'unknown';
};
const ipHashOf = (req) => crypto.createHmac('sha256', secret()).update('ip:' + clientIp(req)).digest('hex').slice(0, 24);
const readToken = (req) => {
  const m = /(?:^|;\s*)d2k_sess=([A-Za-z0-9_-]{20,100})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
};
const readDevice = (req) => { const m = /(?:^|;\s*)d2k_dev=([A-Za-z0-9_-]{20,100})/.exec(req.headers.cookie || ''); return m ? m[1] : null; };
// Cookie kỹ thuật cho khách bình chọn (chống một máy bấm nhiều phiếu), không dùng cho phân tích
const setDevCookie = (res, token) => res.setHeader('Set-Cookie', `d2k_dev=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_SECONDS}`);
const setCookie = (res, token) => res.setHeader('Set-Cookie',
  `${COOKIE}=${token || ''}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${token ? COOKIE_SECONDS : 0}`);

const STATUS = { rename_cooldown: 429, bad_login: 401, unauthorized: 401, forbidden: 403, name_taken: 409, device_limit: 409, locked: 429, acct_limit: 429, rotate_wait: 409, rotate_none: 404, dup_text: 409, not_found: 404, own_review: 403, bad_email: 400, bad_token: 400, email_taken: 409, email_limit: 429, mail_off: 503, mail_fail: 502 };

export default async function handler(req, res) {
  if (!secret()) return res.status(503).json({ ok: false, message: 'Chưa cấu hình AUTH_SECRET.' });
  const ctx = { store: redisStore(), secret: secret(), now: () => Date.now(), mailer: await makeMailer(process.env) };
  const send = (r) => {
    if (r.ok) return res.status(200).json(r);
    return res.status(STATUS[r.code] || 400).json(r);
  };

  try {
    if (req.method === 'GET') {
      const { game, featured, me } = req.query || {};
      if (me) { res.setHeader('Cache-Control', 'no-store'); return send(await core.me(ctx, readToken(req))); }
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
      if (featured) return send(await core.featured(ctx));
      return send(await core.reviews(ctx, String(game || '')));
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ ok: false }); }

    // chống CSRF: bắt buộc Origin của chính site
    const origin = req.headers.origin || '';
    if (!ALLOWED_ORIGINS.some((o) => origin === o)) return res.status(403).json({ ok: false, message: 'Nguồn không hợp lệ.' });
    res.setHeader('Cache-Control', 'no-store');

    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const token = readToken(req);
    const ipHash = ipHashOf(req);

    switch (b.action) {
      case 'rate': {
        const r = await core.rate(ctx, { token, ipHash, game: b.game, stars: b.stars, text: b.text, name: b.name, code: b.code, honeypot: b.website });
        if (r.ok && r.token) { setCookie(res, r.token); delete r.token; }
        return send(r);
      }
      case 'login': {
        const r = await core.login(ctx, { name: b.name, code: b.code, ipHash, token });
        if (r.ok) { setCookie(res, r.token); delete r.token; }
        return send(r);
      }
      case 'remove-device': case 'reset-devices': {
        const r = await core.removeDevices(ctx, { token, name: b.name, code: b.code, ipHash, deviceId: b.action === 'remove-device' ? b.id : null });
        if (r.ok && r.loggedOut) setCookie(res, null);
        return send(r);
      }
      case 'logout': setCookie(res, null); return send(await core.logout(ctx, token));
      case 'me': return send(await core.me(ctx, token));
      case 'delete-account': { const r = await core.deleteAccount(ctx, token); if (r.ok) setCookie(res, null); return send(r); }
      case 'my-reviews': return send(await core.myReviews(ctx, token));
      case 'delete-review': return send(await core.deleteReview(ctx, { token, game: b.game, ipHash }));
      case 'vote': {
        let device = readDevice(req);
        if (!device) { device = crypto.randomBytes(24).toString('base64url'); setDevCookie(res, device); }
        return send(await core.vote(ctx, { token, device, game: b.game, id: b.id, value: b.value, ipHash }));
      }
      case 'my-votes': return send(await core.myVotes(ctx, { token, device: readDevice(req), game: b.game }));
      case 'rename': return send(await core.rename(ctx, { token, name: b.name, ipHash }));
      case 'rotate-request': return send(await core.requestRotate(ctx, { token, ipHash }));
      case 'rotate-mail-request': return send(await core.rotateMailRequest(ctx, { name: b.name, email: b.email, ipHash }));
      case 'rotate-mail-activate': return send(await core.rotateMailLink(ctx, { token: b.token, kind: 'a', ipHash }));
      case 'rotate-mail-cancel': return send(await core.rotateMailLink(ctx, { token: b.token, kind: 'c', ipHash }));
      case 'rotate-cancel': return send(await core.cancelRotate(ctx, token));
      case 'rotate-finish': return send(await core.finishRotate(ctx, { token, ipHash }));
      case 'set-email': return send(await core.setEmail(ctx, { token, email: b.email, code: b.code, ipHash }));
      case 'verify-email': return send(await core.verifyEmail(ctx, { token: b.token, ipHash }));
      case 'remove-email': return send(await core.removeEmail(ctx, { token, code: b.code, ipHash }));
      case 'admin-reset-code': return send(await core.adminResetCode(ctx, { token, name: b.name }));
      case 'report': return send(await core.report(ctx, { game: b.game, id: b.id, ipHash }));
      case 'admin-reports': return send(await core.adminReports(ctx, token));
      case 'admin-remove': return send(await core.adminSetRemoved(ctx, { token, game: b.game, id: b.id, removed: true }));
      case 'admin-restore': return send(await core.adminSetRemoved(ctx, { token, game: b.game, id: b.id, removed: false }));
      default: return res.status(400).json({ ok: false, message: 'Hành động không hợp lệ.' });
    }
  } catch (e) {
    console.error('ratings error', e && e.message);
    return res.status(500).json({ ok: false, message: 'Lỗi máy chủ.' });
  }
}
