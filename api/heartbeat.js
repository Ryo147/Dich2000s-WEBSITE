import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import { normIp } from '../lib/ip.js';

const redis = Redis.fromEnv();

const PRESENCE_KEY = 'online:presence';
const ALLOWED_ORIGIN = 'https://dich2000s.vercel.app';
const RATE_WINDOW_SECONDS = 60, RATE_MAX = 30; // heartbeat thật khoảng 1-2 lần/phút/tab; 30 đủ cho nhiều người chung IP

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const origin = req.headers.origin || '';
    if (origin && origin !== ALLOWED_ORIGIN) return res.status(403).json({ ok: false });
    const f = req.headers['x-forwarded-for'];
    const ip = normIp((typeof f === 'string' && f.split(',')[0].trim()) || (req.socket && req.socket.remoteAddress) || 'unknown');
    const rk = 'rl:hb:' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
    const n = await redis.incr(rk);
    if (n === 1) await redis.expire(rk, RATE_WINDOW_SECONDS);
    if (n > RATE_MAX) return res.status(429).json({ ok: false });
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = typeof body.id === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(body.id) ? body.id : null;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing id' });
    }

    // Ghi lại "lần cuối thấy" của visitor này trong sorted set (score = timestamp)
    await redis.zadd(PRESENCE_KEY, { score: Date.now(), member: id });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('heartbeat error', err);
    return res.status(500).json({ ok: false });
  }
}
