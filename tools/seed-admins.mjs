// Tạo 3 tài khoản quản trị (NhuaInox, nhantc, megabomb) và in mã 3 từ MỘT LẦN.
// Chạy trên máy của bạn (Claude không thấy mã):
//   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... AUTH_SECRET=<đúng giá trị đã đặt trên Vercel> node tools/seed-admins.mjs
// Tài khoản đã tồn tại thì bỏ qua (không ghi đè, không in lại mã). Mất mã: xóa khóa acct:<tên> trong Upstash rồi chạy lại.
import { createAccount, checkName, RESERVED_NAMES } from '../lib/ratings-core.js';
import { redisStore } from '../lib/redis-store.js';

if (!process.env.AUTH_SECRET) { console.error('Thiếu AUTH_SECRET'); process.exit(1); }
const ctx = { store: redisStore(), secret: process.env.AUTH_SECRET, now: () => Date.now() };

for (const name of RESERVED_NAMES) {
  const { key, display } = checkName(name, { allowReserved: true });
  const r = await createAccount(ctx, display, key, { admin: true });
  console.log(r ? `${display}: ${r.code}` : `${display}: đã tồn tại, bỏ qua`);
}
console.log('\nLưu các mã này vào nơi an toàn. Chúng sẽ không hiện lại.');
