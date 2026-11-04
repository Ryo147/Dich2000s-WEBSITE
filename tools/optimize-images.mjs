// Chuyển PNG lớn trong assets/ sang WebP (chạy lại an toàn: bỏ qua file .webp đã mới hơn PNG).
// Dùng: npm run optimize:images
import { readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = 'assets';
const MIN_BYTES = 200 * 1024;
const MAX_WIDTH = 1600;
const QUALITY = 80;
// Giữ PNG: logo, favicon, icon, mã QR (og:image/apple-touch-icon/manifest cần PNG).
const KEEP_PNG = /(logo|favicon|icon|qr)/i;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const kb = (n) => (n / 1024).toFixed(0).padStart(7) + ' KB';
const rows = [];
let before = 0, after = 0;

for await (const file of walk(ROOT)) {
  if (extname(file).toLowerCase() !== '.png') continue;
  const name = file.split(/[\\/]/).pop();
  const src = await stat(file);
  if (src.size <= MIN_BYTES || KEEP_PNG.test(name)) continue;

  const out = file.replace(/\.png$/i, '.webp');
  const dst = await stat(out).catch(() => null);
  if (dst && dst.mtimeMs >= src.mtimeMs) {
    rows.push([file, src.size, dst.size, 'đã có']);
  } else {
    await sharp(file)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    rows.push([file, src.size, (await stat(out)).size, 'mới']);
  }
  before += src.size;
  after += rows.at(-1)[2];
}

for (const [f, a, b, note] of rows) console.log(`${f.padEnd(40)} ${kb(a)} -> ${kb(b)}  (${note})`);
console.log(`Tổng: ${kb(before)} -> ${kb(after)} (${rows.length} ảnh)`);
