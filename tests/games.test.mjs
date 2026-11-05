import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_LIST } from '../lib/games.js';
import { GAMES } from '../lib/ratings-core.js';
import { render } from '../tools/build-games.mjs';
import { ROOT, htmlFiles } from '../tools/bump-versions.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');

test('js/games.js khớp lib/games.js (nếu đỏ: npm run build:games && npm run bump)', () => {
  assert.equal(read('js/games.js'), render());
});

test('mỗi game có trang với data-project-page đúng slug, và lõi dùng cùng danh sách', () => {
  assert.deepEqual(GAMES, GAME_LIST.map((g) => g.slug));
  for (const g of GAME_LIST) {
    assert.ok(existsSync(join(ROOT, g.url)), `thiếu trang ${g.url}`);
    assert.match(read(g.url), new RegExp(`data-project-page="${g.slug}"`), `${g.url} thiếu data-project-page="${g.slug}"`);
  }
});

test('trang nào dùng reviews.js/account.js thì nạp games.js TRƯỚC nó', () => {
  for (const f of htmlFiles()) {
    const t = read(f);
    const use = t.search(/js\/(?:reviews|account)\.js/);
    if (use === -1) continue;
    const g = t.indexOf('js/games.js');
    assert.ok(g !== -1 && g < use, `${f}: thiếu hoặc nạp sai thứ tự js/games.js`);
  }
});
