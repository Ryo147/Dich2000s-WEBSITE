import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Danh sách slug project hợp lệ — khớp với data-project-page trong các trang projects/*.html
const VALID_PROJECTS = new Set(['plague-inc', 're2-remake', 'dmc5', 'dreamcore_1']);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const project = typeof body.project === 'string' ? body.project : null;

    // Luôn tăng tổng lượt xem toàn site
    const pipeline = redis.pipeline();
    pipeline.hincrby('views', 'global', 1);

    if (project && VALID_PROJECTS.has(project)) {
      pipeline.hincrby('views', `project:${project}`, 1);
    }

    await pipeline.exec();

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track error', err);
    return res.status(500).json({ ok: false });
  }
}
