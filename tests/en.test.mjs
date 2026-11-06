import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../tools/bump-versions.mjs';

// Bản tiếng Anh nằm ở en/ (cùng tên file). Nếu đỏ: sửa trang Việt thì sửa trang en/ tương ứng.
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const viPages = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...readdirSync(join(ROOT, 'projects')).filter((f) => f.endsWith('.html')).map((f) => 'projects/' + f),
];
const tags = (s) => [...s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').matchAll(/<(\/?[a-zA-Z][\w-]*)/g)].map((m) => m[1]).filter((t) => t !== 'link');
const clean = (f) => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, ''));

test('mỗi trang tiếng Việt có bản en/ cùng tên, lang="en", canonical và hreflang đúng', () => {
  for (const f of viPages) {
    assert.ok(existsSync(join(ROOT, 'en', f)), `thiếu en/${f}`);
    const en = read('en/' + f);
    assert.match(en, /<html lang="en">/, `en/${f} thiếu lang="en"`);
    if (f === '404.html') continue;
    const vi = read(f);
    const base = 'https://dich2000s.vercel.app';
    const enUrl = base + (f === 'index.html' ? '/en/' : '/en' + clean(f));
    assert.ok(en.includes(`<link rel="canonical" href="${enUrl}">`), `en/${f}: canonical sai (cần ${enUrl})`);
    for (const [name, t] of [['vi', vi], ['en', en]]) {
      assert.ok(t.includes(`hreflang="vi" href="${base + clean(f)}"`), `${name}/${f}: thiếu hreflang vi`);
      assert.ok(t.includes(`hreflang="en" href="${enUrl}"`), `${name}/${f}: thiếu hreflang en`);
    }
  }
});

test('trang en/ chỉ dùng đường dẫn gốc "/" và link nội bộ về /en/ (trừ link "bản tiếng Việt")', () => {
  for (const f of viPages) {
    const en = read('en/' + f);
    const bad = [...en.matchAll(/(?:src|href)="((?!\/|https?:|mailto:|#|data:|tel:)[^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(bad, [], `en/${f}: đường dẫn tương đối ${bad}`);
    const toVi = [...en.matchAll(/(?:href)="\/((?!en\/|assets\/|css\/|js\/|api\/)[^"#]*\.html|[^"#.]*)"/g)].map((m) => m[1]).filter((p) => p !== '' && !p.startsWith('site.') && !/^en(\/|$)/.test(p));
    const allowed = f === 'privacy.html' ? ['privacy.html', 'privacy'] : f === 'noi-quy.html' ? ['noi-quy.html', 'noi-quy'] : [];
    for (const p of toVi) assert.ok(allowed.includes(p), `en/${f}: link về trang tiếng Việt "/${p}"`);
  }
});

test('cấu trúc thẻ HTML của bản en/ khớp bản Việt (trừ đoạn thông báo ở privacy/noi-quy)', () => {
  for (const f of viPages.filter((p) => !['privacy.html', 'noi-quy.html'].includes(p))) {
    assert.deepEqual(tags(read('en/' + f)), tags(read(f)), `en/${f} lệch cấu trúc so với ${f}`);
  }
});

test('FAQ tiếng Anh có cùng số câu và cùng nhóm với FAQ tiếng Việt (JS và JSON-LD)', () => {
  const cats = (t) => [...t.matchAll(/cat:\s*'(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual(cats(read('js/faq.en.js')), cats(read('js/faq.js')));
  const qn = (t) => (t.match(/"@type":\s*"Question"/g) || []).length;
  assert.equal(qn(read('en/faq.html')), qn(read('faq.html')));
  assert.match(read('en/faq.html'), /js\/faq\.en\.js/);
});

test('trang en/ của game giữ đúng data-project-page', () => {
  for (const f of viPages.filter((p) => p.startsWith('projects/'))) {
    const slug = /data-project-page="([^"]+)"/.exec(read(f))[1];
    assert.match(read('en/' + f), new RegExp(`data-project-page="${slug}"`));
  }
});
