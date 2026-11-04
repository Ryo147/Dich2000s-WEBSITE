// Tạo lib/wordlist.js từ bộ âm tiết trong gói npm "dictionary-vi" (chạy: node tools/build-wordlist.mjs <đường-dẫn-index.dic>)
// Mỗi dạng không dấu chỉ xuất hiện một lần (gõ không dấu vẫn đăng nhập được). ~1500 từ => mã 3 từ ~31 bit,
// an toàn nhờ giới hạn số lần đoán (5 lần/15 phút, 20 lần/ngày) và băm scrypt + pepper phía máy chủ.
import { readFileSync, writeFileSync } from 'node:fs';
const strip = (w) => w.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
const BAD = /^(du|dit|lon|cac|buoi|deo|cut|dam|dau|dai|me|cu|bu|chim|xoc|phet|nung|ngu|oc|cho|khon|ngoc|ia|đ)$/;
const lines = readFileSync(process.argv[2], 'utf8').split('\n').slice(1).map((l) => l.split('/')[0].trim());
const seen = new Map();
for (const w of lines) {
  if (!/^[a-zà-ỹđ]{2,6}$/u.test(w)) continue;
  const k = strip(w);
  if (BAD.test(k) || BAD.test(w)) continue;
  // ưu tiên dạng có dấu (đọc giống tiếng Việt hơn); nếu chưa có thì lấy dạng đầu tiên
  if (!seen.has(k) || (seen.get(k) === k && w !== k)) seen.set(k, w);
}
const all = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.error('distinct:', all.length);
const pick = all.map(([, w]) => w);
writeFileSync(new URL('../lib/wordlist.js', import.meta.url), '// Sinh bởi tools/build-wordlist.mjs. Đừng sửa tay: đổi danh sách sẽ làm mã cũ của người dùng mất hiệu lực.\nexport const WORDS = ' + JSON.stringify(pick) + ';\n');
