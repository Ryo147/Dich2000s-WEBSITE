import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REF, htmlFiles, hashOf } from '../tools/bump-versions.mjs';

// Nếu test này đỏ: chạy `npm run build:css && npm run bump` rồi commit lại.
test('mọi ?v= của js/css khớp nội dung file hiện tại (tránh cache immutable giữ bản cũ)', () => {
  const stale = [];
  for (const f of htmlFiles()) {
    for (const [, path, v] of readFileSync(join(ROOT, f), 'utf8').matchAll(REF)) {
      if (existsSync(join(ROOT, path)) && v !== hashOf(path)) stale.push(`${f}: ${path}?v=${v} (cần ${hashOf(path)})`);
    }
  }
  assert.deepEqual(stale, []);
});

test('mọi tham chiếu js/ và css/ trong HTML đều có ?v= (nếu không sẽ bị cache immutable mãi)', () => {
  const missing = [];
  for (const f of htmlFiles()) {
    for (const m of readFileSync(join(ROOT, f), 'utf8').matchAll(/(?:src|href)="((?:\.\.\/|\.\/|\/)?(?:js|css)\/[\w.\-]+\.(?:js|css))"/g)) missing.push(`${f}: ${m[1]}`);
  }
  assert.deepEqual(missing, []);
});
