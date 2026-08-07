import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const PRESENCE_KEY = 'online:presence';
// Coi 1 visitor là "offline" nếu không heartbeat trong 30s
// (client heartbeat mỗi 15s nên khoảng đệm này an toàn)
const PRESENCE_WINDOW_MS = 30 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    const cutoff = now - PRESENCE_WINDOW_MS;

    // Xoá các visitor đã "hết hạn" khỏi sorted set, rồi đếm số còn lại
    await redis.zremrangebyscore(PRESENCE_KEY, 0, cutoff);
    const online = await redis.zcard(PRESENCE_KEY);

    // views là 1 hash: { global: n, "project:slug": n, ... }
    const viewsHash = (await redis.hgetall('views')) || {};

    const projects = {};
    let global = 0;

    for (const [key, value] of Object.entries(viewsHash)) {
      const num = Number(value) || 0;
      if (key === 'global') {
        global = num;
      } else if (key.startsWith('project:')) {
        projects[key.slice('project:'.length)] = num;
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      online,
      views: { global, projects },
    });
  } catch (err) {
    console.error('stats error', err);
    return res.status(500).json({ ok: false });
  }
}
