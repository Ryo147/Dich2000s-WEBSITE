import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../lib/ratings-core.js';

function memStore() {
  const kv = new Map(), hs = new Map(), ss = new Map();
  return {
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v, o = {}) { if (o.nx && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
    async del(k) { kv.delete(k); },
    async expire(k, ttl) { (this.expired ||= []).push([k, ttl]); },
    async incr(k) { const n = (Number(kv.get(k)) || 0) + 1; kv.set(k, n); return n; },
    async hget(k, f) { return (hs.get(k) || {})[f] ?? null; },
    async hset(k, o) { hs.set(k, { ...(hs.get(k) || {}), ...o }); },
    async hdel(k, f) { const h = hs.get(k); if (h) delete h[f]; },
    async hincrby(k, f, n) { const h = hs.get(k) || hs.set(k, {}).get(k); h[f] = (Number(h[f]) || 0) + n; return h[f]; },
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

test('tên đã có thì báo trùng; đúng mã thì vào được; sai mã khóa theo IP sau 5 lần', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  assert.equal((await core.rate(ctx, { ...base, name: 'ryo ' })).code, 'name_taken');
  assert.equal((await core.rate(ctx, { ...base, name: 'RYO', code: 'mot hai ba' })).code, 'bad_login');
  const okLogin = await core.rate(ctx, { ...base, game: 're2-remake', name: 'Ryo', code: a.code });
  assert.ok(okLogin.ok);
  const c2 = mk();
  const real = await core.rate(c2, { ...base, name: 'Ryo' });
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await core.login(c2, { name: 'Ryo', code: 'ác ác ác', ipHash: 'bad-ip' })).code);
  assert.deepEqual(codes.slice(0, 5), Array(5).fill('bad_login'));
  assert.equal(codes[5], 'locked');
  // IP lạ bị khóa không làm chủ tài khoản bị khóa: IP khác vẫn đăng nhập được, IP bị khóa thì không
  assert.ok((await core.login(c2, { name: 'Ryo', code: real.code, ipHash: 'good-ip' })).ok);
  assert.equal((await core.login(c2, { name: 'Ryo', code: real.code, ipHash: 'bad-ip' })).code, 'locked');
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

test('đăng nhập lại ngay trên trình duyệt đang có phiên hợp lệ thì không tính thêm thiết bị', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  for (const ip of ['i1', 'i2', 'i3']) {
    const r = await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: ip, token: a.token });
    assert.ok(r.ok && r.token === a.token, 'dùng lại đúng phiên cũ');
  }
  assert.equal((await core.myReviews(ctx, a.token)).devices.length, 1);
  // thiết bị thứ 2 vẫn vào được
  assert.ok((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i4' })).ok);
});

test('đổi sang tài khoản khác trên cùng trình duyệt không để lại thiết bị ma ở tài khoản cũ', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  const b = await core.rate(ctx, { ...base, name: 'Khac' });
  const r = await core.login(ctx, { name: 'Khac', code: b.code, ipHash: 'i1', token: a.token });
  assert.ok(r.ok);
  assert.equal((await core.me(ctx, a.token)).name, null);
  assert.equal((await core.myReviews(ctx, r.token)).devices.length, 2);
  // tài khoản cũ đã trống chỗ
  assert.ok((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i2' })).ok);
});

test('quản lý thiết bị: xem danh sách, gỡ từng cái và gỡ toàn bộ đều bắt buộc đúng mã', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  const d2 = await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i2' });
  const list = (await core.myReviews(ctx, a.token)).devices;
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((d) => d.current), [true, false]);
  assert.equal(list[0].t, 1000);
  // sai mã, mã người khác hoặc không có mã đều không gỡ được
  assert.equal((await core.removeDevices(ctx, { token: a.token, name: 'Ryo', code: 'mot hai ba', ipHash: 'x1', deviceId: list[1].id })).code, 'bad_login');
  assert.equal((await core.removeDevices(ctx, { token: a.token, name: 'Ryo', code: '', ipHash: 'x1' })).code, 'bad_login');
  assert.equal((await core.me(ctx, d2.token)).name, 'Ryo');
  // id lạ hoặc sai kiểu
  assert.equal((await core.removeDevices(ctx, { token: a.token, name: 'Ryo', code: a.code, ipHash: 'x2', deviceId: 'khong-co' })).code, 'not_found');
  assert.equal((await core.removeDevices(ctx, { token: a.token, name: 'Ryo', code: a.code, ipHash: 'x2', deviceId: 5 })).code, 'bad_request');
  // gỡ đúng thiết bị kia: thiết bị này vẫn sống
  const one = await core.removeDevices(ctx, { token: a.token, name: 'Ryo', code: a.code, ipHash: 'x3', deviceId: list[1].id });
  assert.ok(one.ok && one.removed === 1 && !one.loggedOut);
  assert.equal((await core.me(ctx, d2.token)).name, null);
  assert.equal((await core.me(ctx, a.token)).name, 'Ryo');
  // gỡ toàn bộ, kể cả thiết bị đang dùng
  const all = await core.removeDevices(ctx, { token: a.token, name: 'ryo', code: a.code, ipHash: 'x4' });
  assert.ok(all.ok && all.removed === 1 && all.loggedOut);
  assert.equal((await core.me(ctx, a.token)).name, null);
});

test('đã đủ 2 thiết bị và mất cả hai: reset bằng tên + mã không cần phiên rồi đăng nhập lại', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i2' }); // token bị mất, như xóa cookie
  assert.equal((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i3' })).code, 'device_limit');
  const r = await core.removeDevices(ctx, { token: null, name: 'Ryo', code: a.code, ipHash: 'i3' });
  assert.ok(r.ok && r.removed === 2 && !r.loggedOut);
  assert.equal((await core.me(ctx, a.token)).name, null);
  assert.ok((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i3' })).ok);
});

test('chống tài khoản rác: mỗi IP tối đa 3 tài khoản/ngày, bị từ chối thì không để lại tài khoản', async () => {
  const ctx = mk();
  const games = ['dmc5', 're2-remake', 'plague-inc', 'dreamcore_1'];
  for (let i = 0; i < 3; i++) assert.ok((await core.rate(ctx, { ...base, game: games[i], name: `Khach ${i}`, ipHash: 'spam' })).ok);
  const blocked = await core.rate(ctx, { ...base, game: games[3], name: 'Khach 3', ipHash: 'spam' });
  assert.equal(blocked.code, 'acct_limit');
  assert.ok((await core.rate(ctx, { ...base, game: games[3], name: 'Khach 3', ipHash: 'other' })).ok); // tên chưa bị chiếm, IP khác vẫn tạo được
});

test('chống tài khoản rác: ngưỡng toàn site theo giờ', async () => {
  const ctx = mk();
  const old = core.LIMITS.globalAcctMax;
  core.LIMITS.globalAcctMax = 2;
  try {
    assert.ok((await core.rate(ctx, { ...base, name: 'Aaron', ipHash: 'a1' })).ok);
    assert.ok((await core.rate(ctx, { ...base, name: 'Bella', ipHash: 'a2' })).ok);
    assert.equal((await core.rate(ctx, { ...base, name: 'Cindy', ipHash: 'a3' })).code, 'acct_limit');
  } finally { core.LIMITS.globalAcctMax = old; }
});

test('đánh giá mới theo IP cho mỗi game bị giới hạn, sửa đánh giá cũ thì không tính', async () => {
  const ctx = mk();
  const old = core.LIMITS.ipAcctMax;
  core.LIMITS.ipAcctMax = 99; // chỉ thử ngưỡng đánh giá mới
  try {
    const a = await core.rate(ctx, { ...base, name: 'User1', ipHash: 'same' });
    await core.rate(ctx, { ...base, name: 'User2', ipHash: 'same' });
    await core.rate(ctx, { ...base, name: 'User3', ipHash: 'same' });
    assert.equal((await core.rate(ctx, { ...base, name: 'User4', ipHash: 'same' })).code, 'locked');
    assert.equal((await core.rate(ctx, { ...base, game: 're2-remake', name: 'User4', ipHash: 'same' })).ok, true); // game khác
    for (let i = 0; i < 5; i++) assert.ok((await core.rate(ctx, { ...base, token: a.token, stars: 1 + (i % 5), ipHash: 'same' })).ok); // sửa thoải mái
  } finally { core.LIMITS.ipAcctMax = old; }
});

test('bình luận trùng nội dung giữa các tài khoản bị chặn; tự sửa lại của mình thì được', async () => {
  const ctx = mk();
  const text = 'Bản Việt hóa rất tuyệt vời, cảm ơn nhóm dịch!';
  const a = await core.rate(ctx, { ...base, name: 'Ryo', text, ipHash: 'p1' });
  assert.ok(a.ok);
  const dup = await core.rate(ctx, { ...base, name: 'Khac', text: 'BAN VIET HOA RAT TUYET VOI cam on nhom dich', ipHash: 'p2' });
  assert.equal(dup.code, 'dup_text');
  // bị từ chối thì không tạo tài khoản: tên đó vẫn còn trống
  assert.ok((await core.rate(ctx, { ...base, name: 'Khac', text: 'Mình chơi xong rồi, rất hài lòng.', ipHash: 'p2' })).ok);
  // cùng nội dung ở game khác hoặc do chính chủ gửi lại thì được; bình luận ngắn không bị coi là trùng
  assert.ok((await core.rate(ctx, { ...base, game: 're2-remake', token: a.token, text, ipHash: 'p1' })).ok);
  assert.ok((await core.rate(ctx, { ...base, token: a.token, text, stars: 4, ipHash: 'p1' })).ok);
  assert.ok((await core.rate(ctx, { ...base, name: 'Khac2', text: 'Hay', ipHash: 'p3' })).ok);
});

test('chặn liên kết, thông tin liên hệ và quảng cáo, kể cả viết lách; câu bình thường không bị chặn nhầm', async () => {
  const spam = [
    'xem tại www.abc.vn', 'vào abc.com nhé', 'abc dot com', 'abc (.) net', 'abc chấm vn', 'h t t p s : / / x', 'bit.ly/x', 't.me/abc',
    'Zalo 0912 345 678', 'gọi 0912.345.678', 'ib mình nhé', 'liên hệ abc@gmail.com', 'add @shopxyz', 'nhà cái uy tín', 'c a s i n o', 'bán acc giá rẻ', 'NHẠ CÁI'.replace('Ạ', 'À'),
  ];
  for (const s of spam) assert.equal(core.looksLikeAd(s), true, s);
  const fine = [
    'Bản dịch rất hay, chơi mượt. Cảm ơn nhóm!', 'Chơi được 20 tiếng, đạt 100% thành tựu.', 'Game chạy chậm online hơi lag', 'Mình mua trên Steam giá 1.200.000đ',
    'Dịch tốt, 10/10, 5 sao', 'Hay.Cảm ơn nhóm nhiều', 'Có lỗi font ở chương 3 nhưng không sao',
  ];
  for (const s of fine) assert.equal(core.looksLikeAd(s), false, s);
  const ctx = mk();
  assert.equal((await core.rate(ctx, { ...base, name: 'Ryo', text: 'ib zalo nhé' })).code, 'bad_text');
  assert.equal((await core.rate(ctx, { ...base, name: 'abc.com' })).code, 'bad_name');
  assert.equal((await core.rate(ctx, { ...base, name: 'Zalo 0912345678' })).code, 'bad_name');
  assert.equal((await core.reviews(ctx, 'dmc5')).count, 0);
  // tên cũ trông giống quảng cáo vẫn đăng nhập được (chỉ chặn lúc tạo/đổi tên)
  assert.equal(core.checkName('abc.com', { allowReserved: true }).ok, true);
});

test('phiên hết hạn sau 21 ngày không hoạt động và được gia hạn mỗi lần dùng', async () => {
  assert.equal(core.LIMITS.sessionSeconds, 21 * 24 * 60 * 60);
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  ctx.store.expired = [];
  assert.equal((await core.me(ctx, a.token)).name, 'Ryo');
  assert.equal(ctx.store.expired.length, 1);
  assert.equal(ctx.store.expired[0][1], core.LIMITS.sessionSeconds);
  // phiên đã xóa thì không gia hạn (không hồi sinh)
  await core.logout(ctx, a.token);
  ctx.store.expired = [];
  assert.equal((await core.me(ctx, a.token)).name, null);
  assert.equal(ctx.store.expired.length, 0);
});

test('quên mã: yêu cầu → chờ 24 giờ → chỉ thiết bị yêu cầu hoàn tất; thiết bị khác hủy được', async () => {
  let now = 1000;
  const ctx = { store: memStore(), secret: 'test-secret', now: () => now };
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  const d2 = await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i2' });
  assert.equal((await core.requestRotate(ctx, { token: null, ipHash: 'x' })).code, 'unauthorized');
  const q = await core.requestRotate(ctx, { token: a.token, ipHash: 'x' });
  assert.ok(q.ok && q.rotate.mine && q.rotate.readyAt === 1000 + core.LIMITS.rotateDelayMs);
  // chưa đổi gì: mã cũ vẫn dùng được, thiết bị kia thấy thông báo và không phải "mine"
  assert.ok((await core.login(ctx, { name: 'Ryo', code: a.code, ipHash: 'i3' })).code === 'device_limit');
  assert.equal((await core.myReviews(ctx, d2.token)).rotate.mine, false);
  // yêu cầu lặp không đẩy lùi giờ
  now = 5000; assert.equal((await core.requestRotate(ctx, { token: a.token, ipHash: 'x' })).rotate.readyAt, q.rotate.readyAt);
  // chưa đến giờ, hoặc sai thiết bị
  assert.equal((await core.finishRotate(ctx, { token: a.token, ipHash: 'x' })).code, 'rotate_wait');
  now = 1000 + core.LIMITS.rotateDelayMs + 1;
  assert.equal((await core.finishRotate(ctx, { token: d2.token, ipHash: 'x' })).code, 'forbidden');
  // thiết bị khác hủy → hết hiệu lực
  assert.ok((await core.cancelRotate(ctx, d2.token)).ok);
  assert.equal((await core.finishRotate(ctx, { token: a.token, ipHash: 'x' })).code, 'rotate_none');
  // yêu cầu lại, đến giờ, hoàn tất
  await core.requestRotate(ctx, { token: a.token, ipHash: 'x' });
  now += core.LIMITS.rotateDelayMs + 1;
  const r = await core.finishRotate(ctx, { token: a.token, ipHash: 'x' });
  assert.ok(r.ok && core.canonCode(r.code) && r.code !== a.code);
  assert.equal((await core.me(ctx, d2.token)).name, null);
  assert.equal((await core.me(ctx, a.token)).name, 'Ryo');
  assert.ok((await core.login(ctx, { name: 'Ryo', code: r.code, ipHash: 'i4' })).ok);
});

test('quên mã: quá hạn 24 giờ sau khi hết giờ chờ thì phải yêu cầu lại', async () => {
  let now = 1000;
  const ctx = { store: memStore(), secret: 'test-secret', now: () => now };
  const a = await core.rate(ctx, { ...base, name: 'Ryo' });
  await core.requestRotate(ctx, { token: a.token, ipHash: 'x' });
  now = 1000 + core.LIMITS.rotateDelayMs + core.LIMITS.rotateWindowMs + 1;
  assert.equal((await core.finishRotate(ctx, { token: a.token, ipHash: 'x' })).code, 'rotate_none');
});

test('quên mã và mất hết phiên: chỉ quản trị viên cấp lại được, không áp dụng cho quản trị viên', async () => {
  const ctx = mk();
  const adm = await core.createAccount(ctx, 'NhuaInox', core.nameKey('NhuaInox'), { admin: true });
  const admSess = await core.login(ctx, { name: 'NhuaInox', code: adm.code, ipHash: 'ia' });
  const u = await core.rate(ctx, { ...base, name: 'Ryo' });
  assert.equal((await core.adminResetCode(ctx, { token: u.token, name: 'Ryo' })).code, 'forbidden');
  assert.equal((await core.adminResetCode(ctx, { token: null, name: 'Ryo' })).code, 'forbidden');
  assert.equal((await core.adminResetCode(ctx, { token: admSess.token, name: 'Khongco' })).code, 'not_found');
  assert.equal((await core.adminResetCode(ctx, { token: admSess.token, name: 'NhuaInox' })).code, 'forbidden');
  const r = await core.adminResetCode(ctx, { token: admSess.token, name: 'ryo' });
  assert.ok(r.ok && r.name === 'Ryo' && core.canonCode(r.code));
  assert.equal((await core.me(ctx, u.token)).name, null);
  assert.equal((await core.login(ctx, { name: 'Ryo', code: u.code, ipHash: 'i2' })).code, 'bad_login');
  assert.ok((await core.login(ctx, { name: 'Ryo', code: r.code, ipHash: 'i3' })).ok);
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

test('đổi tên: chuyển đánh giá, phiên vẫn dùng được, tên bị chiếm hoặc dành riêng bị từ chối, cooldown 7 ngày', async () => {
  const ctx = mk();
  const u = await core.rate(ctx, { ...base, name: 'Ryo' });
  await core.rate(ctx, { ...base, game: 're2-remake', token: u.token, stars: 3 });
  await core.rate(ctx, { ...base, name: 'Khac' });
  assert.equal((await core.rename(ctx, { token: u.token, name: 'khac', ipHash: 'r' })).code, 'name_taken');
  assert.equal((await core.rename(ctx, { token: u.token, name: 'NhuaInox', ipHash: 'r' })).code, 'reserved_name');
  const r = await core.rename(ctx, { token: u.token, name: 'Ryo Mới', ipHash: 'r' });
  assert.ok(r.ok);
  assert.equal((await core.me(ctx, u.token)).name, 'Ryo Mới');
  const mine = await core.myReviews(ctx, u.token);
  assert.deepEqual(mine.reviews.map((x) => x.game).sort(), ['dmc5', 're2-remake']);
  assert.equal((await core.reviews(ctx, 'dmc5')).reviews.filter((x) => x.name === 'Ryo Mới').length, 1);
  assert.equal((await core.rename(ctx, { token: u.token, name: 'Ryo Khác', ipHash: 'r' })).code, 'rename_cooldown');
  assert.equal((await core.rename(ctx, { token: null, name: 'Abc', ipHash: 'r' })).code, 'unauthorized');
  // tên cũ được nhả ra cho người khác
  assert.ok((await core.rate(ctx, { ...base, name: 'Ryo' })).ok);
});

// ---------- Email tuỳ chọn ----------
async function withMail(name = 'Ryo') {
  const sent = [];
  const ctx = { ...mk(), mailer: async (m) => { sent.push(m); } };
  const r = await core.rate(ctx, { ...base, name });
  return { ctx, sent, token: r.token };
}
const tokenOf = (m) => /verify=([A-Za-z0-9_-]+)/.exec(m.text)[1];

test('email: tạo tài khoản qua đánh giá không thu email; tắt mailer thì tính năng email tắt', async () => {
  const ctx = mk();
  const r = await core.rate(ctx, { ...base, name: 'Ryo' });
  const mine = await core.myReviews(ctx, r.token);
  assert.equal(mine.email, null);
  assert.equal(mine.mail, false);
  assert.equal((await core.setEmail(ctx, { token: r.token, email: 'a@b.co', ipHash: 'ip1' })).code, 'mail_off');
});

test('email: nhập → nhận mail → bấm liên kết mới được tính; sai/hết hạn/dùng lại bị từ chối', async () => {
  const { ctx, sent, token } = await withMail();
  assert.equal((await core.setEmail(ctx, { token, email: 'khong-hop-le', ipHash: 'ip1' })).code, 'bad_email');
  const r = await core.setEmail(ctx, { token, email: ' Ryo@Gmail.com ', ipHash: 'ip1' });
  assert.ok(r.ok && r.pending === 'ryo@gmail.com');
  assert.equal(sent[0].to, 'ryo@gmail.com');
  let mine = await core.myReviews(ctx, token);
  assert.equal(mine.email, null);
  assert.equal(mine.pendingEmail, 'ryo@gmail.com');
  assert.equal((await core.verifyEmail(ctx, { token: 'x'.repeat(30), ipHash: 'ip1' })).code, 'bad_token');
  const t = tokenOf(sent[0]);
  assert.ok((await core.verifyEmail(ctx, { token: t, ipHash: 'ip1' })).ok);
  mine = await core.myReviews(ctx, token);
  assert.equal(mine.email, 'ryo@gmail.com');
  assert.equal(mine.pendingEmail, null);
  assert.equal((await core.verifyEmail(ctx, { token: t, ipHash: 'ip1' })).code, 'bad_token'); // dùng một lần
  // hết hạn sau 1 giờ
  await core.setEmail(ctx, { token, email: 'moi@gmail.com', ipHash: 'ip1' });
  ctx.now = () => 1000 + 61 * 60 * 1000;
  assert.equal((await core.verifyEmail(ctx, { token: tokenOf(sent[1]), ipHash: 'ip1' })).code, 'bad_token');
});

test('email: yêu cầu mới thay yêu cầu cũ; một email chỉ gắn một tài khoản; giới hạn 3 lần/ngày', async () => {
  const { ctx, sent, token } = await withMail('Ryo');
  await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' });
  await core.setEmail(ctx, { token, email: 'b@gmail.com', ipHash: 'ip1' });
  assert.equal((await core.verifyEmail(ctx, { token: tokenOf(sent[0]), ipHash: 'ip1' })).code, 'bad_token');
  assert.ok((await core.verifyEmail(ctx, { token: tokenOf(sent[1]), ipHash: 'ip1' })).ok);
  assert.equal((await core.setEmail(ctx, { token, email: 'c@gmail.com', ipHash: 'ip1' })).ok, true); // lần 3
  assert.equal((await core.setEmail(ctx, { token, email: 'd@gmail.com', ipHash: 'ip1' })).code, 'email_limit'); // lần 4
  // tài khoản khác không chiếm được email đã xác minh
  const r2 = await core.rate(ctx, { ...base, game: 'dmc5', name: 'Khac', ipHash: 'ip2' });
  await core.setEmail(ctx, { token: r2.token, email: 'b@gmail.com', ipHash: 'ip2' });
  assert.equal((await core.verifyEmail(ctx, { token: tokenOf(sent.at(-1)), ipHash: 'ip2' })).code, 'email_taken');
});

test('email: gỡ email, xoá tài khoản giải phóng email; đổi tên giữ email', async () => {
  const { ctx, sent, token } = await withMail('Ryo');
  await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' });
  await core.verifyEmail(ctx, { token: tokenOf(sent[0]), ipHash: 'ip1' });
  assert.ok((await core.rename(ctx, { token, name: 'RyoMoi', ipHash: 'ip1' })).ok);
  assert.equal((await core.myReviews(ctx, token)).email, 'a@gmail.com');
  assert.ok((await core.removeEmail(ctx, token)).ok);
  assert.equal((await core.myReviews(ctx, token)).email, null);
  await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' });
  await core.verifyEmail(ctx, { token: tokenOf(sent.at(-1)), ipHash: 'ip1' });
  await core.deleteAccount(ctx, token);
  const r2 = await core.rate(ctx, { ...base, name: 'Khac', ipHash: 'ip3' });
  await core.setEmail(ctx, { token: r2.token, email: 'a@gmail.com', ipHash: 'ip3' });
  assert.ok((await core.verifyEmail(ctx, { token: tokenOf(sent.at(-1)), ipHash: 'ip3' })).ok);
});

test('email: yêu cầu đổi mã và hoàn tất đổi mã gửi cảnh báo; mail lỗi không làm hỏng thao tác', async () => {
  const { ctx, sent, token } = await withMail('Ryo');
  await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' });
  await core.verifyEmail(ctx, { token: tokenOf(sent[0]), ipHash: 'ip1' });
  const n0 = sent.length;
  await core.requestRotate(ctx, { token, ipHash: 'ip1' });
  assert.equal(sent.length, n0 + 1);
  assert.match(sent.at(-1).subject, /mã 3 từ mới/);
  await core.requestRotate(ctx, { token, ipHash: 'ip1' }); // lặp lại không gửi thêm
  assert.equal(sent.length, n0 + 1);
  ctx.now = () => 1000 + 25 * 60 * 60 * 1000;
  ctx.mailer = async () => { throw new Error('smtp down'); };
  const f = await core.finishRotate(ctx, { token, ipHash: 'ip1' });
  assert.ok(f.ok && f.code);
});

test('email: lần gửi lỗi không tốn hạn mức xác minh của người dùng', async () => {
  const { ctx, sent, token } = await withMail('Ryo');
  const ok = ctx.mailer;
  ctx.mailer = async () => { throw new Error('smtp down'); };
  for (let i = 0; i < 5; i++) assert.equal((await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' })).code, 'mail_fail');
  ctx.mailer = ok;
  assert.ok((await core.setEmail(ctx, { token, email: 'a@gmail.com', ipHash: 'ip1' })).ok); // vẫn gửi được sau khi cấu hình sửa xong
  assert.equal(sent.length, 1);
});

test('gỡ một đánh giá của mình: mất khỏi danh sách và điểm trung bình, tài khoản còn; người khác không gỡ được của mình', async () => {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo', stars: 5 });
  const b = await core.rate(ctx, { ...base, name: 'Khac', stars: 1, text: 'Khác', ipHash: 'ip2' });
  await core.rate(ctx, { ...base, token: a.token, game: 're2-remake', stars: 4, text: 'Hay 2' });
  assert.equal((await core.deleteReview(ctx, { token: null, game: 'dmc5', ipHash: 'ip1' })).code, 'unauthorized');
  assert.equal((await core.deleteReview(ctx, { token: a.token, game: 'khong-co', ipHash: 'ip1' })).code, 'bad_request');
  assert.ok((await core.deleteReview(ctx, { token: a.token, game: 'dmc5', ipHash: 'ip1' })).ok);
  const l = await core.reviews(ctx, 'dmc5');
  assert.equal(l.count, 1);
  assert.equal(l.avg, 1);
  assert.equal((await core.deleteReview(ctx, { token: a.token, game: 'dmc5', ipHash: 'ip1' })).code, 'not_found');
  const mine = await core.myReviews(ctx, a.token); // tài khoản và đánh giá game khác còn nguyên
  assert.deepEqual(mine.reviews.map((r) => r.game), ['re2-remake']);
  assert.equal((await core.reviews(ctx, 'dmc5')).reviews[0].name, 'Khac');
  assert.ok(b.token);
});

// ---------- Bình chọn hữu ích ----------
const counts = async (ctx, game = 'dmc5') => Object.fromEntries((await core.reviews(ctx, game)).reviews.map((r) => [r.name, [r.up, r.down]]));
async function voteSetup() {
  const ctx = mk();
  const a = await core.rate(ctx, { ...base, name: 'Ryo', stars: 5, text: 'Rất hay' });
  const b = await core.rate(ctx, { ...base, name: 'Khac', stars: 3, text: 'Tạm', ipHash: 'ip2' });
  return { ctx, a, b, ra: 'ryo', rb: 'khac' };
}

test('bình chọn: khách theo máy, đổi ý, bỏ phiếu, mỗi máy một phiếu; số liệu hiện ở danh sách', async () => {
  const { ctx, ra } = await voteSetup();
  const g = (device, value, ip = 'ipv') => core.vote(ctx, { token: null, device, game: 'dmc5', id: ra, value, ipHash: ip });
  const d1 = 'device-one-aaaaaaaaaaaaaaaa', d2 = 'device-two-bbbbbbbbbbbbbbbb';
  assert.deepEqual(await counts(ctx), { Ryo: [0, 0], Khac: [0, 0] });
  assert.equal((await g(d1, 1)).up, 1);
  assert.equal((await g(d1, 1)).up, 1); // bấm lại cùng giá trị: không cộng thêm
  assert.equal((await g(d2, 1)).up, 2);
  const r = await g(d1, -1); // đổi ý
  assert.deepEqual([r.up, r.down, r.mine], [1, 1, -1]);
  assert.deepEqual((await core.myVotes(ctx, { token: null, device: d1, game: 'dmc5' })).votes, { [ra]: -1 });
  assert.deepEqual((await core.myVotes(ctx, { token: null, device: 'khac-device-cccccccccccccccc', game: 'dmc5' })).votes, {});
  const z = await g(d1, 0);
  assert.deepEqual([z.up, z.down], [1, 0]);
  assert.deepEqual((await counts(ctx)).Ryo, [1, 0]);
  assert.equal((await g(d1, 5)).code, 'bad_request');
  assert.equal((await core.vote(ctx, { token: null, device: null, game: 'dmc5', id: ra, value: 1, ipHash: 'ipv' })).code, 'bad_request');
});

test('bình chọn: không tự bình chọn đánh giá của mình, không bình chọn bình luận đã gỡ hoặc không có chữ', async () => {
  const { ctx, a, b, ra, rb } = await voteSetup();
  assert.equal((await core.vote(ctx, { token: a.token, game: 'dmc5', id: ra, value: 1, ipHash: 'ipv' })).code, 'own_review');
  assert.equal((await core.vote(ctx, { token: a.token, game: 'dmc5', id: rb, value: 1, ipHash: 'ipv' })).up, 1); // tài khoản bình chọn người khác
  assert.equal((await core.vote(ctx, { token: null, device: 'd'.repeat(30), game: 'dmc5', id: 'khong-co', value: 1, ipHash: 'ipv' })).code, 'not_found');
  const adm = await core.createAccount(ctx, 'Admin1', core.nameKey('Admin1'), { admin: true });
  const sess = await core.login(ctx, { name: 'Admin1', code: adm.code, ipHash: 'ipx' });
  await core.adminSetRemoved(ctx, { token: sess.token, game: 'dmc5', id: rb, removed: true });
  assert.equal((await core.vote(ctx, { token: a.token, game: 'dmc5', id: rb, value: 1, ipHash: 'ipv' })).code, 'bad_request');
  assert.ok(b.token);
});

test('bình chọn: xóa đánh giá hoặc tài khoản thì phiếu liên quan biến mất; đổi tên giữ nguyên phiếu', async () => {
  const { ctx, a, b, ra, rb } = await voteSetup();
  const dev = 'device-one-aaaaaaaaaaaaaaaa';
  await core.vote(ctx, { token: null, device: dev, game: 'dmc5', id: ra, value: 1, ipHash: 'ipv' });
  await core.vote(ctx, { token: a.token, game: 'dmc5', id: rb, value: -1, ipHash: 'ipv' });
  assert.deepEqual(await counts(ctx), { Ryo: [1, 0], Khac: [0, 1] });
  // Ryo đổi tên: phiếu cho đánh giá của Ryo và phiếu Ryo đã bình chọn đều đi theo
  assert.ok((await core.rename(ctx, { token: a.token, name: 'RyoMoi', ipHash: 'ipr' })).ok);
  assert.deepEqual(await counts(ctx), { RyoMoi: [1, 0], Khac: [0, 1] });
  assert.deepEqual((await core.myVotes(ctx, { token: a.token, game: 'dmc5' })).votes, { [rb]: -1 });
  assert.deepEqual((await core.myVotes(ctx, { token: null, device: dev, game: 'dmc5' })).votes, { ryomoi: 1 });
  // Ryo xóa tài khoản: phiếu Ryo đã cho Khac biến mất, đánh giá của Ryo cùng phiếu của nó cũng mất
  assert.ok((await core.deleteAccount(ctx, a.token)).ok);
  assert.deepEqual(await counts(ctx), { Khac: [0, 0] });
  assert.deepEqual((await core.myVotes(ctx, { token: null, device: dev, game: 'dmc5' })).votes, {});
  // gỡ đánh giá: phiếu mất
  await core.vote(ctx, { token: null, device: dev, game: 'dmc5', id: rb, value: 1, ipHash: 'ipv' });
  assert.ok((await core.deleteReview(ctx, { token: b.token, game: 'dmc5', ipHash: 'ipb' })).ok);
  const r2 = await core.rate(ctx, { ...base, token: b.token, name: 'Khac', stars: 4, text: 'Viết lại' });
  assert.ok(r2.ok);
  assert.deepEqual(await counts(ctx), { Khac: [0, 0] });
});
