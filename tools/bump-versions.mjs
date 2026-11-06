// Gắn ?v=<băm nội dung> cho mọi js/ và css/ được HTML nhắc tới (vercel.json cache /js và /css "immutable",
// nên đổi file mà không đổi ?v= thì người đã truy cập vẫn dùng bản cũ). Chạy: npm run bump (sau build:css).
// Dùng chung với tests/versions.test.mjs để không ai quên bump.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const REF = /((?:js|css)\/[\w.\-]+\.(?:js|css))\?v=([\w]+)/g;

// Trang tiếng Việt ở gốc + projects/, bản tiếng Anh tương ứng ở en/ + en/projects/
export const htmlFiles = () => ['', 'en'].flatMap((d) => [
  ...(existsSync(join(ROOT, d)) ? readdirSync(join(ROOT, d)) : []).filter((f) => f.endsWith('.html')).map((f) => (d ? d + '/' : '') + f),
  ...(existsSync(join(ROOT, d, 'projects')) ? readdirSync(join(ROOT, d, 'projects')) : []).filter((f) => f.endsWith('.html')).map((f) => (d ? d + '/' : '') + 'projects/' + f),
]);
export const hashOf = (rel) => createHash('sha1').update(readFileSync(join(ROOT, rel))).digest('hex').slice(0, 8);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let changed = 0;
  for (const f of htmlFiles()) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const out = src.replace(REF, (m, path) => (existsSync(join(ROOT, path)) ? `${path}?v=${hashOf(path)}` : m));
    if (out !== src) { writeFileSync(join(ROOT, f), out); changed++; }
  }
  console.log(`Đã cập nhật ?v= trong ${changed} file HTML.`);
}
