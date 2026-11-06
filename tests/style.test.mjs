import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, htmlFiles } from '../tools/bump-versions.mjs';

// Đồ họa thống nhất dùng biểu tượng Font Awesome (<i class="fa-...">), không dùng emoji hay ký tự biểu tượng (★ 👍 ✓ ...).
const GLYPH = /[\u{1F300}-\u{1FAFF}☀-➿⭐️‍]/u;

test('không có emoji / ký tự biểu tượng trong HTML, JS và CSS của site (trừ css/tailwind.css đã sinh)', () => {
  const files = [...htmlFiles(), ...readdirSync(join(ROOT, 'js')).map((f) => 'js/' + f), 'css/style.css', 'css/staggered-menu.css', 'lib/ratings-core.js'];
  const bad = [];
  for (const f of files) {
    readFileSync(join(ROOT, f), 'utf8').split('\n').forEach((l, i) => { if (GLYPH.test(l)) bad.push(`${f}:${i + 1}: ${l.trim().slice(0, 80)}`); });
  }
  assert.deepEqual(bad, []);
});

test('trang nào dùng reviews.js/account.js đều nạp Font Awesome (biểu tượng sao, bình chọn)', () => {
  for (const f of htmlFiles()) {
    const t = readFileSync(join(ROOT, f), 'utf8');
    if (/js\/(?:reviews|account)\.js/.test(t)) assert.match(t, /font-awesome/, `${f} thiếu Font Awesome`);
  }
});
