// Đặt lại mã 3 từ của tài khoản quản trị (hoặc tạo tài khoản quản trị mới với --create).
// Chạy trên máy bạn, cần cùng AUTH_SECRET và khóa Redis (Upstash/Vercel KV) với site đang chạy, nếu sai AUTH_SECRET thì mã mới sẽ không đăng nhập được:
//   AUTH_SECRET=... UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node tools/admin-code.mjs <tên> [--create]
// Mã in ra một lần; mọi thiết bị đang đăng nhập của tài khoản đó bị đăng xuất.
import { provisionAdmin } from '../lib/ratings-core.js';
import { redisStore } from '../lib/redis-store.js';

const [name, flag] = process.argv.slice(2);
if (!name || !process.env.AUTH_SECRET) {
  console.error('Dùng: AUTH_SECRET=... UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node tools/admin-code.mjs <tên> [--create]');
  process.exit(1);
}

const r = await provisionAdmin({ store: redisStore(), secret: process.env.AUTH_SECRET, now: Date.now }, name, { create: flag === '--create' });
if (!r.ok) { console.error(r.message); process.exit(1); }
console.log(`${r.created ? 'Đã tạo tài khoản quản trị.' : 'Đã đặt lại mã.'} Mã 3 từ (chỉ hiện một lần): ${r.code}`);
