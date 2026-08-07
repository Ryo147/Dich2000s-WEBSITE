import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const PRESENCE_KEY = 'online:presence';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = typeof body.id === 'string' ? body.id.slice(0, 100) : null;

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
