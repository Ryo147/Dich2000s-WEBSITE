// Lõi hệ thống đánh giá: không phụ thuộc Vercel/Redis cụ thể, nhận `store` qua ctx để test được.
// store cần: get, set(k,v,{ex,nx}), del, incr(k,ttl), hget, hset, hdel, hgetall, sadd, srem, smembers
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { WORDS } from './wordlist.js';

const scrypt = promisify(crypto.scrypt);

export const GAMES = ['plague-inc', 're2-remake', 'dmc5', 'dreamcore_1'];
export const RESERVED_NAMES = ['NhuaInox', 'nhantc', 'megabomb'];
export const REMOVED_TEXT = 'Đã gỡ vì vi phạm nội quy';
export const LIMITS = {
  maxDevices: 2, textMax: 600, nameMin: 3, nameMax: 24,
  guessLockAfter: 5, guessLockSeconds: 15 * 60, guessDayMax: 20, guessDaySeconds: 24 * 60 * 60,
  // chặn dự phòng theo tên: đủ cao để một người lạ không khóa nổi chủ tài khoản, đủ thấp để botnet đoán mã không có lợi
  acctDayMax: 500,
  ipGuessMax: 30, ipGuessSeconds: 15 * 60, ipWriteMax: 30, ipWriteSeconds: 10 * 60,
  sessionSeconds: 30 * 24 * 60 * 60,
};

const err = (code, message, extra) => ({ ok: false, code, message, ...extra });
const ok = (extra) => ({ ok: true, ...extra });
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const strip = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

// ---------- Tên ----------
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };
const RESERVED_WORDS = ['admin', 'moderator', 'quantri', 'dich2000s', 'dichnhungnam2000'];

export function nameKey(raw) {
  let s = strip(String(raw).normalize('NFKC')).toLowerCase();
  s = s.replace(/[01345788@$!|]/g, (c) => LEET[c] || c);
  s = s.replace(/[^a-z0-9]/g, '');       // bỏ khoảng trắng, dấu câu, ký tự lạ
  s = s.replace(/(.)\1+/g, '$1');        // "nhuaaa  inoxx" -> "nhuainox"
  return s;
}

const reservedKeys = () => [...RESERVED_NAMES, ...RESERVED_WORDS].map(nameKey);

export function checkName(raw, { allowReserved = false } = {}) {
  const display = String(raw ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  const len = [...display].length;
  if (len < LIMITS.nameMin || len > LIMITS.nameMax) return err('bad_name', `Tên cần từ ${LIMITS.nameMin} đến ${LIMITS.nameMax} ký tự.`);
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(display)) return err('bad_name', 'Tên chỉ gồm chữ, số, khoảng trắng, dấu gạch ngang, gạch dưới hoặc dấu chấm.');
  const key = nameKey(display);
  if (key.length < 3) return err('bad_name', 'Tên cần có ít nhất 3 chữ hoặc số.');
  if (!allowReserved && reservedKeys().some((r) => key.includes(r))) {
    return err('reserved_name', 'Tên này dành riêng cho quản trị viên hoặc quá giống tên đó. Hãy chọn tên khác.');
  }
  return ok({ display, key });
}

// ---------- Mã 3 từ ----------
const WORD_BY_KEY = new Map(WORDS.map((w) => [strip(w).toLowerCase(), w]));

export function generateCode() {
  return [0, 1, 2].map(() => WORDS[crypto.randomInt(WORDS.length)]).join(' ');
}

// Trả về dạng chuẩn "a-b-c" (không dấu) hoặc null nếu không phải mã hợp lệ
export function canonCode(input) {
  const parts = strip(String(input ?? '')).toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (parts.length !== 3 || !parts.every((p) => WORD_BY_KEY.has(p))) return null;
  return parts.join('-');
}

async function hashCode(canon, saltHex, secret) {
  const pepper = crypto.createHmac('sha256', secret).update(canon).digest();
  return (await scrypt(pepper, Buffer.from(saltHex, 'hex'), 32, { N: 16384, r: 8, p: 1 })).toString('hex');
}

async function verifyCode(acct, canon, secret) {
  const got = Buffer.from(await hashCode(canon, acct.salt, secret), 'hex');
  const want = Buffer.from(acct.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// ---------- Tài khoản và thiết bị ----------
const acctKey = (k) => `acct:${k}`;
const sessKey = (h) => `sess:${h}`;
const rvKey = (g) => `rv:${g}`;

async function getAcct(ctx, key) {
  const v = await ctx.store.get(acctKey(key));
  return v ? parse(v) : null;
}
const putAcct = (ctx, key, a) => ctx.store.set(acctKey(key), JSON.stringify(a));

export async function createAccount(ctx, display, key, { admin = false } = {}) {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await hashCode(canonCode(code), salt, ctx.secret);
  const acct = { name: display, salt, hash, devices: [], admin, created: ctx.now() };
  // nx: hai người cùng lúc giành một tên thì chỉ một người thắng
  const res = await ctx.store.set(acctKey(key), JSON.stringify(acct), { nx: true });
  return res ? { acct, code } : null;
}

// Mở một phiên mới cho thiết bị; trả lỗi khi đã đủ 2 thiết bị
async function openSession(ctx, key, acct) {
  const live = [];
  for (const h of acct.devices) if (await ctx.store.get(sessKey(h))) live.push(h);
  if (live.length >= LIMITS.maxDevices) {
    acct.devices = live; await putAcct(ctx, key, acct);
    return err('device_limit', 'Tài khoản này đã đăng nhập trên 2 thiết bị. Hãy bấm "Đăng xuất" ở một thiết bị rồi thử lại.');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const h = sha(token);
  await ctx.store.set(sessKey(h), JSON.stringify({ k: key }), { ex: LIMITS.sessionSeconds });
  acct.devices = [...live, h];
  await putAcct(ctx, key, acct);
  return ok({ token });
}

export async function sessionAccount(ctx, token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const s = await ctx.store.get(sessKey(sha(token)));
  if (!s) return null;
  const { k } = parse(s);
  const acct = await getAcct(ctx, k);
  return acct ? { key: k, acct } : null;
}

// ---------- Giới hạn đoán mã ----------
// Khóa theo IP (không theo tài khoản): người lạ nhập sai không làm chủ tài khoản bị khóa.
// shortcut: IP dùng chung (Wi-Fi công cộng, CGNAT) có thể bị khóa lây, nâng giới hạn nếu gặp nhiều.
async function guessGate(ctx, key, ipHash) {
  if (await ctx.store.get(`lock:ip:${ipHash}`) || await ctx.store.get(`lock:${key}`)) {
    return err('locked', 'Đã nhập sai quá nhiều lần. Vui lòng thử lại sau.');
  }
  const ip = await ctx.store.incr(`ipg:${ipHash}`, LIMITS.ipGuessSeconds);
  if (ip > LIMITS.ipGuessMax) return err('locked', 'Thao tác quá nhiều lần từ mạng của bạn. Vui lòng thử lại sau.');
  return null;
}

async function guessFailed(ctx, key, ipHash) {
  const n = await ctx.store.incr(`gf:ip:${ipHash}`, LIMITS.guessLockSeconds);
  const d = await ctx.store.incr(`gd:ip:${ipHash}`, LIMITS.guessDaySeconds);
  if (d >= LIMITS.guessDayMax) await ctx.store.set(`lock:ip:${ipHash}`, '1', { ex: LIMITS.guessDaySeconds });
  else if (n >= LIMITS.guessLockAfter) await ctx.store.set(`lock:ip:${ipHash}`, '1', { ex: LIMITS.guessLockSeconds });
  const a = await ctx.store.incr(`gda:${key}`, LIMITS.guessDaySeconds);
  if (a >= LIMITS.acctDayMax) await ctx.store.set(`lock:${key}`, '1', { ex: LIMITS.guessDaySeconds });
}

// Kiểm tra tên + mã; trả {key, acct} hoặc lỗi
async function authenticate(ctx, name, code, ipHash) {
  const n = checkName(name, { allowReserved: true });
  if (!n.ok) return n;
  const gate = await guessGate(ctx, n.key, ipHash);
  if (gate) return gate;
  const acct = await getAcct(ctx, n.key);
  const bad = err('bad_login', 'Tên hoặc mã không đúng.');
  if (!acct) return bad;
  const canon = canonCode(code);
  if (!canon || !(await verifyCode(acct, canon, ctx.secret))) { await guessFailed(ctx, n.key, ipHash); return bad; }
  await ctx.store.del(`gf:ip:${ipHash}`);
  return ok({ key: n.key, acct });
}

export async function login(ctx, { name, code, ipHash }) {
  const a = await authenticate(ctx, name, code, ipHash);
  if (!a.ok) return a;
  const s = await openSession(ctx, a.key, a.acct);
  return s.ok ? ok({ token: s.token, name: a.acct.name, admin: !!a.acct.admin }) : s;
}

export async function logout(ctx, token) {
  const s = await sessionAccount(ctx, token);
  if (!s) return ok();
  const h = sha(token);
  await ctx.store.del(sessKey(h));
  s.acct.devices = s.acct.devices.filter((x) => x !== h);
  await putAcct(ctx, s.key, s.acct);
  return ok();
}

export async function me(ctx, token) {
  const s = await sessionAccount(ctx, token);
  return s ? ok({ name: s.acct.name, admin: !!s.acct.admin }) : ok({ name: null });
}

export async function deleteAccount(ctx, token) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (s.acct.admin) return err('forbidden', 'Không thể xóa tài khoản quản trị.');
  for (const g of GAMES) await ctx.store.hdel(rvKey(g), s.key);
  for (const h of s.acct.devices) await ctx.store.del(sessKey(h));
  await ctx.store.del(acctKey(s.key));
  return ok();
}

// ---------- Đánh giá ----------
function cleanText(raw) {
  const t = String(raw ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  if ([...t].length > LIMITS.textMax) return err('bad_text', `Bình luận tối đa ${LIMITS.textMax} ký tự.`);
  if (/https?:|www\.|\.(com|net|org|vn|xyz|gg)\b/i.test(t)) return err('bad_text', 'Bình luận không được chứa liên kết.');
  return ok({ text: t });
}

export async function rate(ctx, { token, game, stars, text, name, code, ipHash, honeypot }) {
  if (honeypot) return ok({ fake: true });
  if (!GAMES.includes(game)) return err('bad_game', 'Dự án không hợp lệ.');
  const st = Number(stars);
  if (!Number.isInteger(st) || st < 1 || st > 5) return err('bad_stars', 'Số sao phải từ 1 đến 5.');
  const t = cleanText(text);
  if (!t.ok) return t;
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) {
    return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  }

  let key, acct, newToken, newCode;
  const sess = await sessionAccount(ctx, token);
  if (sess) { key = sess.key; acct = sess.acct; }
  else {
    const n = checkName(name);
    if (!n.ok) {
      // tên dành riêng vẫn cho phép đăng nhập bằng mã (quản trị viên), nên chỉ chặn khi KHÔNG có mã
      if (!(n.code === 'reserved_name' && code)) return n;
    }
    const nn = checkName(name, { allowReserved: true });
    const existing = await getAcct(ctx, nn.key);
    if (existing) {
      if (!code) return err('name_taken', 'Tên này đã có người dùng. Nếu là bạn, hãy nhập mã 3 từ để đăng nhập; nếu không, hãy chọn tên khác.');
      const a = await authenticate(ctx, nn.display, code, ipHash);
      if (!a.ok) return a;
      key = a.key; acct = a.acct;
    } else {
      if (!n.ok) return n;
      const created = await createAccount(ctx, n.display, n.key);
      if (!created) return err('name_taken', 'Tên này vừa có người dùng. Hãy chọn tên khác.');
      key = n.key; acct = created.acct; newCode = created.code;
    }
    const s = await openSession(ctx, key, acct);
    if (!s.ok) return s;
    newToken = s.token;
  }

  const prev = await ctx.store.hget(rvKey(game), key);
  const old = prev ? parse(prev) : null;
  const rv = {
    name: acct.name, stars: st, text: t.text, ts: old ? old.ts : ctx.now(), edited: old ? ctx.now() : undefined,
    // đổi nội dung thì mở lại để quản trị viên xét lại; giữ nguyên chữ cũ thì vẫn bị gỡ
    removed: old && old.removed && old.text === t.text ? true : undefined,
  };
  await ctx.store.hset(rvKey(game), { [key]: JSON.stringify(rv) });
  return ok({ token: newToken, code: newCode, name: acct.name, updated: !!old });
}

const publicReview = (id, v) => ({
  id, name: v.name, stars: v.stars, ts: v.ts, edited: v.edited,
  removed: !!v.removed, text: v.removed ? REMOVED_TEXT : v.text,
});

export async function reviews(ctx, game) {
  if (!GAMES.includes(game)) return err('bad_game', 'Dự án không hợp lệ.');
  const all = (await ctx.store.hgetall(rvKey(game))) || {};
  const list = Object.entries(all).map(([id, v]) => publicReview(id, parse(v))).sort((a, b) => b.ts - a.ts);
  const dist = [0, 0, 0, 0, 0];
  for (const r of list) dist[r.stars - 1]++; // sao của bình luận bị gỡ vẫn được tính
  const count = list.length;
  const avg = count ? Math.round((list.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10 : 0;
  return ok({ game, count, avg, dist, reviews: list.slice(0, 50) });
}

export async function featured(ctx, n = 6) {
  const out = [];
  for (const game of GAMES) {
    const r = await reviews(ctx, game);
    for (const v of r.reviews) if (!v.removed && v.text) out.push({ ...v, game });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return ok({ reviews: out.slice(0, n) });
}

// ---------- Báo cáo và quản trị ----------
export async function report(ctx, { game, id, ipHash }) {
  if (!GAMES.includes(game) || typeof id !== 'string' || id.length > 40) return err('bad_request', 'Yêu cầu không hợp lệ.');
  if (!(await ctx.store.hget(rvKey(game), id))) return err('not_found', 'Không tìm thấy bình luận.');
  const first = await ctx.store.set(`rpd:${game}:${id}:${ipHash}`, '1', { nx: true, ex: 24 * 60 * 60 });
  if (!first) return ok({ duplicate: true });
  await ctx.store.incr(`rp:${game}:${id}`, 30 * 24 * 60 * 60);
  await ctx.store.sadd('rpset', `${game}:${id}`);
  return ok();
}

async function requireAdmin(ctx, token) {
  const s = await sessionAccount(ctx, token);
  return s && s.acct.admin ? s : null;
}

export async function adminReports(ctx, token) {
  if (!(await requireAdmin(ctx, token))) return err('forbidden', 'Không có quyền.');
  const items = [];
  for (const m of (await ctx.store.smembers('rpset')) || []) {
    const i = m.indexOf(':');
    const game = m.slice(0, i), id = m.slice(i + 1);
    const v = await ctx.store.hget(rvKey(game), id);
    if (!v) { await ctx.store.srem('rpset', m); continue; }
    const rv = parse(v);
    const reports = Number(await ctx.store.get(`rp:${game}:${id}`)) || 0;
    items.push({ ...publicReview(id, rv), game, reports, rawText: rv.text });
  }
  return ok({ items: items.sort((a, b) => b.reports - a.reports) });
}

// Chỉ gỡ/khôi phục phần chữ; số sao luôn được giữ nguyên
export async function adminSetRemoved(ctx, { token, game, id, removed }) {
  if (!(await requireAdmin(ctx, token))) return err('forbidden', 'Không có quyền.');
  if (!GAMES.includes(game) || typeof id !== 'string') return err('bad_request', 'Yêu cầu không hợp lệ.');
  const v = await ctx.store.hget(rvKey(game), id);
  if (!v) return err('not_found', 'Không tìm thấy bình luận.');
  const rv = parse(v);
  rv.removed = removed ? true : undefined;
  await ctx.store.hset(rvKey(game), { [id]: JSON.stringify(rv) });
  if (!removed) { await ctx.store.srem('rpset', `${game}:${id}`); await ctx.store.del(`rp:${game}:${id}`); }
  return ok();
}
