import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../lib/ratings-core.js';

function memStore() {
  const kv = new Map(), hs = new Map(), ss = new Map();
  return {
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v, o = {}) { if (o.nx && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
    async del(k) { kv.delete(k); },
    async incr(k) { const n = (Number(kv.get(k)) || 0) + 1; kv.set(k, n); return n; },
    async hget(k, f) { return (hs.get(k) || {})[f] ?? null; },
    async hset(k, o) { hs.set(k, { ...(hs.get(k) || {}), ...o }); },
    async hdel(k, f) { const h = hs.get(k); if (h) delete h[f]; },
    async hgetall(k) { return hs.get(k) ? { ...hs.get(k) } : null; },
    async sadd(k, m) { (ss.get(k) || ss.set(k, new Set()).get(k)).add(m); },
    async srem(k, m) { ss.get(k)?.delete(m); },
    async smembers(k) { return [...(ss.get(k) || [])]; },
  };
}
const mk = () => ({ store: memStore(), secret: 'test-secret', now: () => 1000 });
const base = { game: 'dmc5', stars: 5, text: 'Hay', ipHash: 'ip1' };

test('chuẩn hóa tên chống lách luật', () => {
  const k = core.nameKey;
  assert.equal(k('NhuaInox'), 'nhuainox');
  for (const v of ['Nhựa Inox', 'nhua_inox', 'N h u a I n o x', 'NHUAAA1NOX', 'Ｎhuainox', 'nhu4 !n0x']) assert.equal(k(v), 'nhuainox', v);
  assert.equal(k('Mega-Bomb'), 'megabomb');
  assert.equal(core.checkName('Nhựa Inox').code, 'reserved_name');
  assert.equal(core.checkName('xNhuaInox2').code, 'reserved_name');
  assert.equal(core.checkName('admin').code, 'reserved_name');
  assert.equal(core.checkName('Ryo').ok, true);
  assert.equal(core.checkName('a').code, 'bad_name');
  assert.equal(core.checkName('<b>x</b>').code, 'bad_name');
});

test('mã 3 từ: sinh ra, chuẩn hóa, bỏ dấu vẫn nhận', () => {
  const code = core.generateCode();
  const canon = core.canonCode(code);
  assert.ok(canon);
  assert.equal(core.canonCode(code.toUpperCase().replaceAll(' ', '  ')), canon);
  assert.equal(core.canonCode(core.strip(code)), canon);
  assert.equal(core.canonCode('một hai'), null);
  assert.equal(core.canonCode('xyz abc qwe'), null);
});

test('đánh giá lần đầu tự tạo tài khoản, trả mã một lần, sửa được, 1 lần/game', async () => {
  const ctx = mk();
  const r = await core.rate(ctx, { ...base, name: 'Ryo' });
  assert.ok(r.ok && r.token && core.canonCode(r.code));
  const r2 = await core.rate(ctx, { ...base, token: r.token, stars: 2, text: 'Sửa' });
  assert.ok(r2.ok && r2.updated && !r2.code);
  const list = await core.reviews(ctx, 'dmc5');
  assert.equal(list.count, 1);
  assert.equal(list.reviews[0].stars, 2);
  assert.equal(list.avg, 2);
});

test('tên đã có thì báo trùng; đúng mã thì vào được; sai mã bị khóa sau 5 lần', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  assert.equal((await core.rate(ctx, { ...base, name: 'ryo ' })).code, 'name_taken');
  assert.equal((await core.rate(ctx, { ...base, name: 'RYO', code: 'mot hai ba' })).code, 'bad_login');
  const okLogin = await core.rate(ctx, { ...base, game: 're2-remake', name: 'Ryo', code: a.code });
  assert.ok(okLogin.ok);
  const c2 = mk();
  await core.rate(c2, { ...base, name: 'Ryo' });
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await core.login(c2, { name: 'Ryo', code: 'ác ác ác', ipHash: 'ipx' + i })).code);
  assert.deepEqual(codes.slice(0, 5), Array(5).fill('bad_login'));
  assert.equal(codes[5], 'locked');
});

test('tối đa 2 thiết bị, đăng xuất giải phóng chỗ', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  const d2 = await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'ip2' });
  assert.ok(d2.ok);
  assert.equal((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'ip3' })).code, 'device_limit');
  await core.logout(ctx, d2.token);
  assert.equal((await core.me(ctx, d2.token)).name, null);
  assert.ok((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'ip4' })).ok);
});

test('quản trị viên gỡ chữ nhưng sao vẫn tính; người thường không gỡ được', async () => {
  const ctx = mk();
  const adm = await core.createAccount(ctx, 'NhuaInox', core.nameKey('NhuaInox'), { admin: true });
  const user = await core.rate(ctx, { ...base, stars: 1, text: 'tệ lắm', name: 'Khach' });
  const id = core.nameKey('Khach');
  assert.equal((await core.adminSetRemoved(ctx, { token: user.token, game: 'dmc5', id, removed: true })).code, 'forbidden');
  const l = await core.login(ctx, { name: 'nhuainox', code: adm.code, ipHash: 'ipa' });
  assert.ok(l.ok);
  assert.ok((await core.adminSetRemoved(ctx, { token: l.token, game: 'dmc5', id, removed: true })).ok);
  const list = await core.reviews(ctx, 'dmc5');
  assert.equal(list.reviews[0].text, core.REMOVED_TEXT);
  assert.equal(list.avg, 1);
  assert.equal((await core.featured(ctx)).reviews.length, 0);
});

test('người thường không thể tạo tên quản trị, honeypot và liên kết bị chặn', async () => {
  const ctx = mk();
  assert.equal((await core.rate(ctx, { ...base, name: 'megabomb' })).code, 'reserved_name');
  assert.equal((await core.rate(ctx, { ...base, name: 'Ryo', text: 'xem http://x.com' })).code, 'bad_text');
  const hp = await core.rate(ctx, { ...base, name: 'Bot', honeypot: 'x' });
  assert.ok(hp.fake);
  assert.equal((await core.reviews(ctx, 'dmc5')).count, 0);
});

test('báo cáo: mỗi IP một lần; xóa tài khoản xóa đánh giá', async () => {
  const ctx = mk();
  const u = await core.rate(ctx, { ...base, name: 'Khach' });
  const id = core.nameKey('Khach');
  assert.ok((await core.report(ctx, { game: 'dmc5', id, ipHash: 'r1' })).ok);
  assert.ok((await core.report(ctx, { game: 'dmc5', id, ipHash: 'r1' })).duplicate);
  assert.ok((await core.deleteAccount(ctx, u.token)).ok);
  assert.equal((await core.reviews(ctx, 'dmc5')).count, 0);
  assert.equal((await core.me(ctx, u.token)).name, null);
});
