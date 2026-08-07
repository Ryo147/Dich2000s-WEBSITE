import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

// Danh sách slug project hợp lệ — khớp với data-project-page trong các trang projects/*.html
const VALID_PROJECTS = new Set(['plague-inc', 're2-remake', 'dmc5', 'dreamcore_1']);

// Chỉ chấp nhận request bắt nguồn từ chính site (chặn script/site khác gọi thẳng API)
// Thêm domain custom vào đây nếu bạn gắn thêm domain riêng cho site.
const ALLOWED_ORIGINS = [
  'https://dich2000s.vercel.app',
];

// 1 lượt xem / 1 trang / 1 visitor được tính trong vòng 24h — chặn F5 spam liên tục
const VISITOR_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

// Chặn spam theo IP: cùng 1 trang từ cùng 1 IP chỉ tính 1 lần mỗi 10 phút,
// dù visitor đổi id (xoá localStorage, ẩn danh...). Không chặn quá gắt vì
// nhiều người thật có thể chung IP (mạng trường, công ty, wifi quán net).
const IP_DEDUPE_TTL_SECONDS = 10 * 60;

// Giới hạn tần suất gọi API theo IP để chặn script spam thẳng vào /api/track
const IP_RATE_LIMIT_WINDOW_SECONDS = 60;
const IP_RATE_LIMIT_MAX_REQUESTS = 20;

const BOT_UA_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /curl/i, /wget/i,
  /python-requests/i, /headlesschrome/i, /go-http-client/i, /axios/i,
];

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function hashValue(value) {
  const salt = process.env.STATS_SALT || 'd2k-default-salt-change-me';
  return crypto.createHash('sha256').update(salt + ':' + value).digest('hex').slice(0, 24);
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return true; // 1 số trình duyệt không gửi Origin cho same-origin fetch — lớp khác sẽ xử lý
  return ALLOWED_ORIGINS.some((o) => origin.indexOf(o) === 0);
}

function isLikelyBot(req) {
  const ua = req.headers['user-agent'] || '';
  return BOT_UA_PATTERNS.some((re) => re.test(ua));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!isAllowedOrigin(req)) {
      return res.status(403).json({ ok: false, error: 'forbidden origin' });
    }

    if (isLikelyBot(req)) {
      // Không báo lỗi cho client — chỉ lặng lẽ không tính view
      return res.status(200).json({ ok: true, counted: false });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const project = typeof body.project === 'string' ? body.project : null;
    const page = typeof body.page === 'string' ? body.page.slice(0, 200) : 'unknown';
    const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 100) : null;

    if (!visitorId) {
      return res.status(400).json({ ok: false, error: 'missing visitorId' });
    }

    const ip = getClientIp(req);
    const ipHash = hashValue(ip);

    // --- Lớp 1: rate limit theo IP (chặn script spam liên tục) ---
    const rlKey = `rl:track:${ipHash}`;
    const rlCount = await redis.incr(rlKey);
    if (rlCount === 1) {
      await redis.expire(rlKey, IP_RATE_LIMIT_WINDOW_SECONDS);
    }
    if (rlCount > IP_RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({ ok: false, error: 'rate limited' });
    }

    // --- Lớp 2: dedupe theo visitor + trang, 24h (chặn F5 liên tục) ---
    const visitorDedupeKey = `dedupe:${page}:${visitorId}`;
    const visitorFirstTime = await redis.set(visitorDedupeKey, 1, {
      nx: true,
      ex: VISITOR_DEDUPE_TTL_SECONDS,
    });

    // --- Lớp 3: dedupe theo IP + trang, cooldown 10 phút (chặn đổi id giả) ---
    const ipDedupeKey = `dedupe-ip:${page}:${ipHash}`;
    const ipFirstTime = await redis.set(ipDedupeKey, 1, {
      nx: true,
      ex: IP_DEDUPE_TTL_SECONDS,
    });

    if (!visitorFirstTime || !ipFirstTime) {
      return res.status(200).json({ ok: true, counted: false });
    }

    // Vượt qua hết các lớp chặn -> đây là 1 lượt xem thật, tăng bộ đếm
    const pipeline = redis.pipeline();
    pipeline.hincrby('views', 'global', 1);
    if (project && VALID_PROJECTS.has(project)) {
      pipeline.hincrby('views', `project:${project}`, 1);
    }
    await pipeline.exec();

    return res.status(200).json({ ok: true, counted: true });
  } catch (err) {
    console.error('track error', err);
    return res.status(500).json({ ok: false });
  }
}
