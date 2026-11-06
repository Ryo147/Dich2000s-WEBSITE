// Lõi hệ thống đánh giá: không phụ thuộc Vercel/Redis cụ thể, nhận `store` qua ctx để test được.
// store cần: get, set(k,v,{ex,nx}), del, expire(k,ttl), incr(k,ttl), hget, hset, hdel, hgetall, sadd, srem, smembers
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { WORDS } from './wordlist.js';
import { GAME_SLUGS } from './games.js';

const scrypt = promisify(crypto.scrypt);

export const GAMES = GAME_SLUGS;
export const RESERVED_NAMES = ['NhuaInox', 'nhantc', 'megabomb'];
export const REMOVED_TEXT = 'Đã gỡ vì vi phạm nội quy';
export const LIMITS = {
  maxDevices: 2, textMax: 600, nameMin: 3, nameMax: 24,
  guessLockAfter: 5, guessLockSeconds: 15 * 60, guessDayMax: 20, guessDaySeconds: 24 * 60 * 60,
  // chặn dự phòng theo tên: đủ cao để một người lạ không khóa nổi chủ tài khoản, đủ thấp để botnet đoán mã không có lợi
  rotateDelayMs: 24 * 60 * 60 * 1000, rotateWindowMs: 24 * 60 * 60 * 1000,
  acctDayMax: 500, renameCooldownMs: 7 * 24 * 60 * 60 * 1000,
  ipGuessMax: 30, ipGuessSeconds: 15 * 60, ipWriteMax: 30, ipWriteSeconds: 10 * 60,
  sessionSeconds: 21 * 24 * 60 * 60, // phiên hết hạn sau ngần này thời gian KHÔNG hoạt động; mỗi lần dùng được gia hạn lại
  // chống tài khoản rác: tài khoản mới theo IP và toàn site, đánh giá mới theo IP cho mỗi game, bình luận trùng giữa các tài khoản
  ipAcctMax: 3, ipAcctSeconds: 24 * 60 * 60, globalAcctMax: 40, globalAcctSeconds: 60 * 60,
  emailTokenMs: 60 * 60 * 1000, emailAcctDayMax: 3, emailIpDayMax: 10, emailFailMax: 20, emailMax: 254,
  voteVoterDay: 100, voteIpDay: 300,
  ipReviewMax: 3, ipReviewSeconds: 24 * 60 * 60, dupMinLen: 15, dupSeconds: 7 * 24 * 60 * 60,
};

const err = (code, message, extra) => ({ ok: false, code, message, ...extra });
const ok = (extra) => ({ ok: true, ...extra });
const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const strip = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

// ---------- Liên kết, liên hệ, quảng cáo ----------
const TLD = 'com|net|org|vn|xyz|gg|io|me|ly|tv|cc|info|biz|shop|top|site|online|club|app|link|store|vip|pro|ws';
const AD_RES = [
  /(?:https?|ftp):|www\./,                                                    // liên kết trực tiếp
  new RegExp(`[a-z0-9]\\.(?:${TLD})\\b`),                                     // abc.com, t.me, bit.ly
  new RegExp(`[a-z0-9]\\s*(?:\\(\\.\\)|\\[\\.\\]|\\bdot\\b)\\s*(?:${TLD})\\b`), // abc dot com, abc (.) net
  /@\s*[a-z0-9]/,                                                             // email, @tag
  /\d(?:[\s.\-]?\d){8,}/,                                                     // số điện thoại (9 chữ số trở lên)
  /\b(?:inbox|ib|zalo|telegram|whatsapp|sdt|hotline|nha cai|ca cuoc|casino|no hu|tai xiu|keo bong|ban acc|mua acc|nap the|nap tien|vay tien|kiem tien|giam gia|khuyen mai)\b/,
];
const AD_SQUASHED = /http|www|telegram|casino|nhacai|cacuoc|taixiu|whatsapp|zalo/; // chữ bị tách cách: "h t t p", "c a s i n o"

// True nếu chuỗi chứa liên kết, thông tin liên hệ hoặc quảng cáo (kể cả viết lách).
// shortcut: danh sách từ khóa tiếng Việt thủ công, bổ sung vào AD_RES khi thấy mẫu spam mới.
export function looksLikeAd(raw) {
  const low = String(raw ?? '').normalize('NFKC').toLowerCase();
  const flat = strip(low);
  if (/chấm\s*(?:com|net|org|vn|xyz|gg|io|me)\b/.test(low)) return true;  // "abc chấm com" (cần dấu nên kiểm tra trước khi bỏ dấu)
  return AD_RES.some((re) => re.test(flat)) || AD_SQUASHED.test(flat.replace(/[^a-z0-9]/g, ''));
}

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
  // chỉ khi tạo/đổi tên: đăng nhập (allowReserved) bỏ qua để tài khoản cũ không bị khóa ngoài
  if (!allowReserved && looksLikeAd(display)) return err('bad_name', 'Tên không được chứa liên kết, thông tin liên hệ hoặc quảng cáo.');
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
// Mã hiển thị cho thiết bị trong trang tài khoản: 16 ký tự đầu của băm phiên, không đủ để đăng nhập
const deviceIdOf = (h) => h.slice(0, 16);
const rvKey = (g) => `rv:${g}`;

async function getAcct(ctx, key) {
  const v = await ctx.store.get(acctKey(key));
  return v ? parse(v) : null;
}
const putAcct = (ctx, key, a) => ctx.store.set(acctKey(key), JSON.stringify(a));

async function newSecret(ctx) {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  return { code, salt, hash: await hashCode(canonCode(code), salt, ctx.secret) };
}

export async function createAccount(ctx, display, key, { admin = false } = {}) {
  const { code, salt, hash } = await newSecret(ctx);
  const acct = { name: display, salt, hash, devices: [], admin, created: ctx.now() };
  // nx: hai người cùng lúc giành một tên thì chỉ một người thắng
  const res = await ctx.store.set(acctKey(key), JSON.stringify(acct), { nx: true });
  return res ? { acct, code } : null;
}

// Các phiên còn sống của tài khoản: [{h, t}] (t = lúc đăng nhập, phiên cũ có thể không có)
async function liveDevices(ctx, acct) {
  const live = [];
  for (const h of acct.devices) {
    const v = await ctx.store.get(sessKey(h));
    if (v) live.push({ h, t: parse(v).t });
  }
  return live;
}

// Mở một phiên mới cho thiết bị; trả lỗi khi đã đủ 2 thiết bị.
// `token` là cookie hiện có của trình duyệt: nếu nó đã là phiên hợp lệ của tài khoản này thì dùng lại, không tính thêm thiết bị.
async function openSession(ctx, key, acct, token) {
  const live = await liveDevices(ctx, acct);
  const cur = token ? sha(token) : null;
  const mine = cur && live.find((d) => d.h === cur);
  if (mine) {
    await ctx.store.set(sessKey(cur), JSON.stringify({ k: key, t: mine.t }), { ex: LIMITS.sessionSeconds });
    return ok({ token });
  }
  if (live.length >= LIMITS.maxDevices) {
    acct.devices = live.map((d) => d.h); await putAcct(ctx, key, acct);
    return err('device_limit', 'Tài khoản này đã đăng nhập trên 2 thiết bị. Hãy đăng xuất ở một thiết bị, hoặc vào trang Tài khoản để gỡ thiết bị (nhập tên và mã 3 từ).');
  }
  const newToken = crypto.randomBytes(32).toString('base64url');
  const h = sha(newToken);
  await ctx.store.set(sessKey(h), JSON.stringify({ k: key, t: ctx.now() }), { ex: LIMITS.sessionSeconds });
  acct.devices = [...live.map((d) => d.h), h];
  await putAcct(ctx, key, acct);
  return ok({ token: newToken });
}

export async function sessionAccount(ctx, token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const h = sha(token);
  const s = await ctx.store.get(sessKey(h));
  if (!s) return null;
  const { k } = parse(s);
  const acct = await getAcct(ctx, k);
  // dùng là gia hạn; dùng expire (không dùng set) để phiên vừa bị xóa bởi yêu cầu song song không bị hồi sinh
  if (acct) await ctx.store.expire(sessKey(h), LIMITS.sessionSeconds);
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

export async function login(ctx, { name, code, ipHash, token }) {
  const a = await authenticate(ctx, name, code, ipHash);
  if (!a.ok) return a;
  // Trình duyệt này đang giữ phiên của tài khoản khác: bỏ phiên đó, vì cookie sắp bị ghi đè và nó sẽ thành "thiết bị ma" chiếm chỗ
  const cur = await sessionAccount(ctx, token);
  if (cur && cur.key !== a.key) await logout(ctx, token);
  const s = await openSession(ctx, a.key, a.acct, token);
  return s.ok ? ok({ token: s.token, name: a.acct.name, admin: !!a.acct.admin }) : s;
}

// Quên mã nhưng còn đăng nhập ở thiết bị này: tạo mã mới theo 3 bước có độ trễ, để chủ tài khoản kịp phát hiện nếu có người
// ---------- Email tuỳ chọn (chỉ để gửi cảnh báo bảo mật) ----------
// ctx.mailer = async ({to, subject, text}); không có (thiếu cấu hình) thì tính năng email tắt, phần còn lại vẫn chạy.
// Khóa: emt:{băm token} -> {k, addr, exp} (liên kết xác minh), emp:{khóa tài khoản} -> băm token mới nhất, em:{băm email} -> khóa tài khoản đã xác minh.
// shortcut: Gmail bỏ qua dấu chấm và +tag nên một người vẫn gắn được nhiều alias; chấp nhận, vì email không phải khóa danh tính.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const emKey = (addr) => `em:${sha(addr)}`;
const SITE = 'https://dich2000s.vercel.app';

export function checkEmail(raw) {
  const addr = String(raw ?? '').normalize('NFKC').trim().toLowerCase();
  if (addr.length > LIMITS.emailMax || !EMAIL_RE.test(addr) || addr.includes('..')) return err('bad_email', 'Email không hợp lệ.');
  return ok({ addr });
}

// Gửi thông báo, không bao giờ làm hỏng thao tác chính nếu gửi lỗi.
async function notify(ctx, acct, subject, text) {
  if (!ctx.mailer || !acct.email) return;
  try { await ctx.mailer({ to: acct.email, subject, text: `Chào ${acct.name},\n\n${text}\n\nNếu không phải bạn, hãy vào ${SITE}/tai-khoan.html để xử lý.\nĐây là email tự động của Dịch 2000s, bạn có thể gỡ email này trong trang Tài khoản.` }); } catch { /* bỏ qua */ }
}

export async function setEmail(ctx, { token, email, ipHash }) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (!ctx.mailer) return err('mail_off', 'Tính năng email chưa được bật.');
  const e = checkEmail(email);
  if (!e.ok) return e;
  if (s.acct.email === e.addr) return ok({ same: true });
  // chỉ mail GỬI THÀNH CÔNG mới tính vào hạn mức (lỗi cấu hình SMTP không làm người dùng hết lượt); lần gửi lỗi có hạn mức riêng
  const used = async (k) => Number(await ctx.store.get(k)) || 0;
  if ((await used(`ema:${s.key}`)) >= LIMITS.emailAcctDayMax || (await used(`emi:${ipHash}`)) >= LIMITS.emailIpDayMax || (await used(`emf:${ipHash}`)) >= LIMITS.emailFailMax) {
    return err('email_limit', 'Bạn đã yêu cầu xác minh quá nhiều lần hôm nay. Hãy thử lại vào ngày mai.');
  }
  const t = crypto.randomBytes(24).toString('base64url');
  const old = await ctx.store.get(`emp:${s.key}`);
  if (old) await ctx.store.del(`emt:${old}`); // yêu cầu mới thay yêu cầu cũ
  const th = sha(t);
  await ctx.store.set(`emt:${th}`, JSON.stringify({ k: s.key, addr: e.addr, exp: ctx.now() + LIMITS.emailTokenMs }), { ex: LIMITS.emailTokenMs / 1000 });
  await ctx.store.set(`emp:${s.key}`, th, { ex: LIMITS.emailTokenMs / 1000 });
  try {
    await ctx.mailer({ to: e.addr, subject: 'Xác minh email - Dịch 2000s', text: `Chào ${s.acct.name},\n\nBấm liên kết sau để xác minh email (hiệu lực 1 giờ):\n${SITE}/tai-khoan.html?verify=${t}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này. Nếu không thấy mail, hãy kiểm tra mục Spam.` });
  } catch (e) {
    console.error('mail send failed', e && e.code, e && e.responseCode, e && e.message); // không có mật khẩu trong thông báo lỗi của nodemailer
    await ctx.store.del(`emt:${th}`);
    await ctx.store.incr(`emf:${ipHash}`, 24 * 60 * 60);
    return err('mail_fail', 'Không gửi được email. Hãy thử lại sau.');
  }
  await ctx.store.incr(`ema:${s.key}`, 24 * 60 * 60);
  await ctx.store.incr(`emi:${ipHash}`, 24 * 60 * 60);
  return ok({ pending: e.addr });
}

export async function verifyEmail(ctx, { token, ipHash }) {
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,60}$/.test(token)) return err('bad_token', 'Liên kết không hợp lệ hoặc đã hết hạn.');
  const th = sha(token);
  const v = await ctx.store.get(`emt:${th}`);
  const rec = v ? parse(v) : null;
  if (!rec || ctx.now() >= rec.exp) return err('bad_token', 'Liên kết không hợp lệ hoặc đã hết hạn.');
  const acct = await getAcct(ctx, rec.k);
  if (!acct || (await ctx.store.get(`emp:${rec.k}`)) !== th) return err('bad_token', 'Liên kết không hợp lệ hoặc đã hết hạn.');
  const claimed = await ctx.store.set(emKey(rec.addr), rec.k, { nx: true });
  if (!claimed && (await ctx.store.get(emKey(rec.addr))) !== rec.k) return err('email_taken', 'Email này đã được gắn với một tài khoản khác.');
  if (acct.email && acct.email !== rec.addr) await ctx.store.del(emKey(acct.email));
  await putAcct(ctx, rec.k, { ...acct, email: rec.addr });
  await ctx.store.del(`emt:${th}`);
  await ctx.store.del(`emp:${rec.k}`);
  return ok({ email: rec.addr });
}

export async function removeEmail(ctx, token) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (s.acct.email) await ctx.store.del(emKey(s.acct.email));
  const old = await ctx.store.get(`emp:${s.key}`);
  if (old) { await ctx.store.del(`emt:${old}`); await ctx.store.del(`emp:${s.key}`); }
  const { email: _drop, ...rest } = s.acct;
  await putAcct(ctx, s.key, rest);
  return ok();
}

// mượn máy đang đăng nhập (tài khoản chỉ có tên + mã nên không có yếu tố xác minh thứ hai):
//   1) requestRotate: chưa đổi gì, chỉ hẹn giờ (24 giờ), ghi lại thiết bị yêu cầu
//   2) trong lúc chờ, MỌI thiết bị đang đăng nhập đều thấy thông báo và bấm cancelRotate được
//   3) hết giờ, CHỈ thiết bị đã yêu cầu mới finishRotate được (trong 24 giờ); mã cũ vô hiệu, thiết bị khác bị đăng xuất
// shortcut: người giữ cả mã lẫn máy vẫn thắng; nếu cả hai thiết bị cùng nằm trong tay kẻ xấu thì không có cách chặn ngoài quản trị viên.
async function pendingRotate(ctx, acct) {
  const p = acct.pendingRotate;
  if (!p || ctx.now() >= p.expiresAt || !(await ctx.store.get(sessKey(p.by)))) return null;
  return p;
}
const pubRotate = (p, cur) => (p ? { readyAt: p.readyAt, expiresAt: p.expiresAt, mine: p.by === cur } : null);

export async function requestRotate(ctx, { token, ipHash }) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  const cur = sha(token);
  let p = await pendingRotate(ctx, s.acct);
  if (!p) {
    const readyAt = ctx.now() + LIMITS.rotateDelayMs;
    p = { by: cur, readyAt, expiresAt: readyAt + LIMITS.rotateWindowMs };
    await putAcct(ctx, s.key, { ...s.acct, pendingRotate: p });
    await notify(ctx, s.acct, 'Có yêu cầu tạo mã 3 từ mới - Dịch 2000s', `Một thiết bị đang đăng nhập vừa yêu cầu tạo mã 3 từ mới. Mã chỉ đổi sau 24 giờ (từ ${new Date(readyAt).toISOString()} UTC); mã cũ vẫn dùng được trong lúc chờ.\nBạn có thể huỷ yêu cầu ở trang Tài khoản.`);
  }
  return ok({ rotate: pubRotate(p, cur) });
}

export async function cancelRotate(ctx, token) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (s.acct.pendingRotate) { const { pendingRotate: _drop, ...rest } = s.acct; await putAcct(ctx, s.key, rest); }
  return ok();
}

export async function finishRotate(ctx, { token, ipHash }) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  const cur = sha(token);
  const p = await pendingRotate(ctx, s.acct);
  if (!p) return err('rotate_none', 'Không có yêu cầu tạo mã mới đang chờ (hoặc đã hết hạn). Hãy yêu cầu lại.');
  if (p.by !== cur) return err('forbidden', 'Chỉ thiết bị đã yêu cầu mới hoàn tất được.');
  if (ctx.now() < p.readyAt) return err('rotate_wait', 'Chưa đến giờ. Hãy quay lại sau khi hết thời gian chờ.', { readyAt: p.readyAt });
  const { code, salt, hash } = await newSecret(ctx);
  for (const h of s.acct.devices) if (h !== cur) await ctx.store.del(sessKey(h));
  const { pendingRotate: _drop, ...rest } = s.acct;
  await putAcct(ctx, s.key, { ...rest, salt, hash, devices: [cur] });
  await notify(ctx, s.acct, 'Mã 3 từ đã được đổi - Dịch 2000s', 'Mã 3 từ của tài khoản vừa được đổi và các thiết bị khác đã bị đăng xuất.');
  return ok({ code });
}

// Gỡ một thiết bị (deviceId) hoặc toàn bộ (deviceId == null). Tài khoản chỉ có tên + mã 3 từ nên luôn xác thực lại bằng mã,
// kể cả khi đang đăng nhập; không cần phiên nên dùng được lúc đã đủ 2 thiết bị và không đăng nhập nổi.
export async function removeDevices(ctx, { token, name, code, ipHash, deviceId = null }) {
  if (deviceId !== null && typeof deviceId !== 'string') return err('bad_request', 'Yêu cầu không hợp lệ.');
  const a = await authenticate(ctx, name, code, ipHash);
  if (!a.ok) return a;
  const all = a.acct.devices;
  const gone = deviceId === null ? all : all.filter((h) => deviceIdOf(h) === deviceId);
  if (!gone.length && deviceId !== null) return err('not_found', 'Không tìm thấy thiết bị.');
  for (const h of gone) await ctx.store.del(sessKey(h));
  a.acct.devices = all.filter((h) => !gone.includes(h));
  await putAcct(ctx, a.key, a.acct);
  return ok({ removed: gone.length, loggedOut: !!token && gone.includes(sha(token)) });
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
  for (const g of GAMES) { await ctx.store.hdel(rvKey(g), s.key); await dropReviewVotes(ctx, g, s.key); }
  await dropVoter(ctx, `a:${s.key}`);
  for (const h of s.acct.devices) await ctx.store.del(sessKey(h));
  if (s.acct.email) await ctx.store.del(emKey(s.acct.email));
  await ctx.store.del(acctKey(s.key));
  return ok();
}

// ---------- Cài đặt tài khoản ----------
export async function myReviews(ctx, token) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  const out = [];
  for (const game of GAMES) {
    const v = await ctx.store.hget(rvKey(game), s.key);
    if (v) { const r = parse(v); out.push({ game, stars: r.stars, ts: r.ts, edited: r.edited, removed: !!r.removed, text: r.removed ? REMOVED_TEXT : r.text }); }
  }
  const cur = sha(token);
  const devices = (await liveDevices(ctx, s.acct)).map((d) => ({ id: deviceIdOf(d.h), t: d.t, current: d.h === cur }));
  const rotate = pubRotate(await pendingRotate(ctx, s.acct), cur);
  let pendingEmail = null;
  const ph = await ctx.store.get(`emp:${s.key}`);
  const pv = ph && (await ctx.store.get(`emt:${ph}`));
  if (pv && ctx.now() < parse(pv).exp) pendingEmail = parse(pv).addr;
  return ok({ name: s.acct.name, admin: !!s.acct.admin, reviews: out, devices, rotate, mail: !!ctx.mailer, email: s.acct.email || null, pendingEmail });
}

// Gỡ MỘT đánh giá của chính mình (không xóa tài khoản). Số sao và bình luận biến mất khỏi trang và điểm trung bình.
export async function deleteReview(ctx, { token, game, ipHash }) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (!GAMES.includes(game)) return err('bad_request', 'Yêu cầu không hợp lệ.');
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  if (!(await ctx.store.hget(rvKey(game), s.key))) return err('not_found', 'Bạn chưa đánh giá game này.');
  await ctx.store.hdel(rvKey(game), s.key);
  await dropReviewVotes(ctx, game, s.key);
  return ok();
}

// Đổi tên hiển thị. Đổi sang tên có khóa khác thì chuyển tài khoản, phiên và đánh giá sang khóa mới.
export async function rename(ctx, { token, name, ipHash }) {
  const s = await sessionAccount(ctx, token);
  if (!s) return err('unauthorized', 'Bạn chưa đăng nhập.');
  if (s.acct.admin) return err('forbidden', 'Tài khoản quản trị không đổi tên được.');
  const n = checkName(name);
  if (!n.ok) return n;
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax) return err('locked', 'Thao tác quá nhiều lần. Vui lòng thử lại sau.');
  if (s.acct.renamed && ctx.now() - s.acct.renamed < LIMITS.renameCooldownMs) {
    return err('rename_cooldown', 'Bạn vừa đổi tên gần đây. Mỗi tài khoản chỉ đổi tên 1 lần trong 7 ngày.');
  }
  const oldKey = s.key;
  const acct = { ...s.acct, name: n.display, renamed: ctx.now() };
  if (n.key === oldKey) { // chỉ đổi cách viết (hoa/thường, dấu): giữ nguyên khóa
    await putAcct(ctx, oldKey, acct);
    for (const g of GAMES) {
      const v = await ctx.store.hget(rvKey(g), oldKey);
      if (v) await ctx.store.hset(rvKey(g), { [oldKey]: JSON.stringify({ ...parse(v), name: n.display }) });
    }
    return ok({ name: n.display });
  }
  const claimed = await ctx.store.set(acctKey(n.key), JSON.stringify(acct), { nx: true });
  if (!claimed) return err('name_taken', 'Tên này đã có người dùng. Hãy chọn tên khác.');
  for (const d of await liveDevices(ctx, acct)) await ctx.store.set(sessKey(d.h), JSON.stringify({ k: n.key, t: d.t }), { ex: LIMITS.sessionSeconds });
  for (const g of GAMES) {
    const v = await ctx.store.hget(rvKey(g), oldKey);
    if (v) {
      await ctx.store.hset(rvKey(g), { [n.key]: JSON.stringify({ ...parse(v), name: n.display }) });
      await ctx.store.hdel(rvKey(g), oldKey);
    }
  }
  if (acct.email) await ctx.store.set(emKey(acct.email), n.key);
  await migrateVotes(ctx, oldKey, n.key);
  await ctx.store.del(acctKey(oldKey));
  return ok({ name: n.display });
}

// ---------- Đánh giá ----------
function cleanText(raw) {
  const t = String(raw ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  if ([...t].length > LIMITS.textMax) return err('bad_text', `Bình luận tối đa ${LIMITS.textMax} ký tự.`);
  if (looksLikeAd(t)) return err('bad_text', 'Bình luận không được chứa liên kết, thông tin liên hệ hoặc quảng cáo.');
  return ok({ text: t });
}

// Khóa chống trùng bình luận: bỏ dấu, chỉ giữ chữ và số; bình luận quá ngắn ("hay", "ok") không kiểm tra
function dupKeyOf(game, text) {
  const norm = strip(text).toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm.length >= LIMITS.dupMinLen ? `dup:${game}:${sha(norm)}` : null;
}

// Mọi chặn gian lận chạy TRƯỚC khi tạo tài khoản hoặc mở phiên, để yêu cầu bị từ chối không để lại tài khoản hay thiết bị rác.
// shortcut: bộ đếm cửa sổ cố định (bắt đầu từ lần đầu), IP dùng chung (CGNAT, Wi-Fi công cộng) có thể bị chặn lây; nâng LIMITS nếu gặp nhiều.
async function fraudGate(ctx, { game, key, ipHash, text, creating }) {
  const dk = dupKeyOf(game, text);
  const owner = dk && await ctx.store.get(dk);
  if (owner && String(owner) !== key) return err('dup_text', 'Bình luận này giống hệt một bình luận khác. Hãy viết theo ý của bạn.');
  if (creating) {
    if ((await ctx.store.incr(`ipa:${ipHash}`, LIMITS.ipAcctSeconds)) > LIMITS.ipAcctMax) {
      return err('acct_limit', 'Mạng của bạn đã tạo quá nhiều tài khoản hôm nay. Hãy dùng tài khoản đã có hoặc thử lại vào ngày mai.');
    }
    if ((await ctx.store.incr('acg', LIMITS.globalAcctSeconds)) > LIMITS.globalAcctMax) {
      return err('acct_limit', 'Hệ thống đang tạm dừng tạo tài khoản mới do có quá nhiều yêu cầu. Vui lòng thử lại sau.');
    }
  }
  if (creating || !(await ctx.store.hget(rvKey(game), key))) { // chỉ đánh giá mới tính, sửa đánh giá cũ thì không
    if ((await ctx.store.incr(`ipr:${game}:${ipHash}`, LIMITS.ipReviewSeconds)) > LIMITS.ipReviewMax) {
      return err('locked', 'Mạng của bạn đã gửi quá nhiều đánh giá mới cho dự án này hôm nay. Hãy thử lại vào ngày mai.');
    }
  }
  return null;
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
  if (sess) {
    key = sess.key; acct = sess.acct;
    const g = await fraudGate(ctx, { game, key, ipHash, text: t.text });
    if (g) return g;
  } else {
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
      const g = await fraudGate(ctx, { game, key: a.key, ipHash, text: t.text });
      if (g) return g;
      key = a.key; acct = a.acct;
    } else {
      if (!n.ok) return n;
      const g = await fraudGate(ctx, { game, key: n.key, ipHash, text: t.text, creating: true });
      if (g) return g;
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
  const dk = dupKeyOf(game, t.text);
  if (dk) await ctx.store.set(dk, key, { ex: LIMITS.dupSeconds });
  return ok({ token: newToken, code: newCode, name: acct.name, updated: !!old });
}

// ---------- Bình chọn hữu ích / không hữu ích ----------
// Người bình chọn: tài khoản đang đăng nhập ("a:<khóa>") hoặc khách theo MÁY ("d:<băm cookie d2k_dev>").
// Khóa: vt:{game}:{id} (hash voter -> 1/-1), vc:{game} (hash "{id}:u"/"{id}:d" -> số phiếu), vm:{voter} (set "game:id" để xóa/chuyển phiếu theo người).
// shortcut: khách xóa cookie hoặc dùng thêm trình duyệt thì bình chọn lại được, chỉ có hạn mức theo IP và theo người; chấp nhận vì phiếu không đổi điểm sao.
const vtKey = (g, id) => `vt:${g}:${id}`;
const vcKey = (g) => `vc:${g}`;
const vmKey = (v) => `vm:${v}`;
const voterOf = (s, device) => (s ? `a:${s.key}` : device ? `d:${sha(device).slice(0, 24)}` : null);

async function applyVote(ctx, game, id, voter, value) {
  const prev = Number(await ctx.store.hget(vtKey(game, id), voter)) || 0;
  if (prev === value) return prev;
  if (value === 0) { await ctx.store.hdel(vtKey(game, id), voter); await ctx.store.srem(vmKey(voter), `${game}:${id}`); }
  else { await ctx.store.hset(vtKey(game, id), { [voter]: value }); await ctx.store.sadd(vmKey(voter), `${game}:${id}`); }
  const up = (value === 1 ? 1 : 0) - (prev === 1 ? 1 : 0), down = (value === -1 ? 1 : 0) - (prev === -1 ? 1 : 0);
  if (up) await ctx.store.hincrby(vcKey(game), `${id}:u`, up);
  if (down) await ctx.store.hincrby(vcKey(game), `${id}:d`, down);
  return value;
}

// Xóa toàn bộ phiếu của một đánh giá (đánh giá bị gỡ hoặc tài khoản chủ bị xóa)
async function dropReviewVotes(ctx, game, id) {
  for (const voter of Object.keys((await ctx.store.hgetall(vtKey(game, id))) || {})) await ctx.store.srem(vmKey(voter), `${game}:${id}`);
  await ctx.store.del(vtKey(game, id));
  await ctx.store.hdel(vcKey(game), `${id}:u`);
  await ctx.store.hdel(vcKey(game), `${id}:d`);
}

// Xóa mọi phiếu mà một người đã bình chọn (tài khoản bị xóa)
async function dropVoter(ctx, voter) {
  for (const m of (await ctx.store.smembers(vmKey(voter))) || []) {
    const i = m.indexOf(':');
    await applyVote(ctx, m.slice(0, i), m.slice(i + 1), voter, 0);
  }
  await ctx.store.del(vmKey(voter));
}

// Đổi tên (đổi khóa tài khoản): chuyển phiếu của các đánh giá do mình viết và các phiếu do mình bình chọn
async function migrateVotes(ctx, oldKey, newKey) {
  for (const g of GAMES) {
    const votes = (await ctx.store.hgetall(vtKey(g, oldKey))) || {};
    if (Object.keys(votes).length) {
      await ctx.store.hset(vtKey(g, newKey), votes);
      for (const voter of Object.keys(votes)) { await ctx.store.srem(vmKey(voter), `${g}:${oldKey}`); await ctx.store.sadd(vmKey(voter), `${g}:${newKey}`); }
      const vc = (await ctx.store.hgetall(vcKey(g))) || {};
      for (const f of ['u', 'd']) if (vc[`${oldKey}:${f}`] !== undefined) await ctx.store.hincrby(vcKey(g), `${newKey}:${f}`, Number(vc[`${oldKey}:${f}`]) || 0);
    }
    await dropReviewVotes(ctx, g, oldKey);
  }
  const oldV = `a:${oldKey}`;
  for (const m of (await ctx.store.smembers(vmKey(oldV))) || []) {
    const i = m.indexOf(':');
    const g = m.slice(0, i), id = m.slice(i + 1);
    const val = Number(await ctx.store.hget(vtKey(g, id), oldV)) || 0;
    await ctx.store.hdel(vtKey(g, id), oldV);
    if (val) { await ctx.store.hset(vtKey(g, id), { [`a:${newKey}`]: val }); await ctx.store.sadd(vmKey(`a:${newKey}`), m); }
  }
  await ctx.store.del(vmKey(oldV));
}

export async function vote(ctx, { token, device, game, id, value, ipHash }) {
  if (!GAMES.includes(game) || typeof id !== 'string' || id.length > 40 || ![1, -1, 0].includes(value)) return err('bad_request', 'Yêu cầu không hợp lệ.');
  const s = await sessionAccount(ctx, token);
  const voter = voterOf(s, device);
  if (!voter) return err('bad_request', 'Yêu cầu không hợp lệ.');
  if (s && s.key === id) return err('own_review', 'Bạn không thể bình chọn đánh giá của chính mình.');
  if ((await ctx.store.incr(`ipw:${ipHash}`, LIMITS.ipWriteSeconds)) > LIMITS.ipWriteMax
    || (await ctx.store.incr(`vtd:${voter}`, 24 * 60 * 60)) > LIMITS.voteVoterDay
    || (await ctx.store.incr(`vti:${ipHash}`, 24 * 60 * 60)) > LIMITS.voteIpDay) return err('locked', 'Bạn bình chọn quá nhiều lần. Vui lòng thử lại sau.');
  const v = await ctx.store.hget(rvKey(game), id);
  const rv = v ? parse(v) : null;
  if (!rv) return err('not_found', 'Không tìm thấy bình luận.');
  if (rv.removed || !rv.text) return err('bad_request', 'Không thể bình chọn bình luận này.');
  const mine = await applyVote(ctx, game, id, voter, value);
  const vc = (await ctx.store.hgetall(vcKey(game))) || {};
  return ok({ id, mine, up: Math.max(0, Number(vc[`${id}:u`]) || 0), down: Math.max(0, Number(vc[`${id}:d`]) || 0) });
}

// Phiếu của người đang xem trong một game: { id: 1 | -1 }
export async function myVotes(ctx, { token, device, game }) {
  if (!GAMES.includes(game)) return err('bad_request', 'Yêu cầu không hợp lệ.');
  const voter = voterOf(await sessionAccount(ctx, token), device);
  const votes = {};
  if (voter) {
    for (const m of (await ctx.store.smembers(vmKey(voter))) || []) {
      if (!m.startsWith(game + ':')) continue;
      const id = m.slice(game.length + 1);
      const val = Number(await ctx.store.hget(vtKey(game, id), voter)) || 0;
      if (val) votes[id] = val;
    }
  }
  return ok({ votes });
}

const publicReview = (id, v) => ({
  id, name: v.name, stars: v.stars, ts: v.ts, edited: v.edited,
  removed: !!v.removed, text: v.removed ? REMOVED_TEXT : v.text,
});

export async function reviews(ctx, game) {
  if (!GAMES.includes(game)) return err('bad_game', 'Dự án không hợp lệ.');
  const all = (await ctx.store.hgetall(rvKey(game))) || {};
  const vc = (await ctx.store.hgetall(vcKey(game))) || {};
  const list = Object.entries(all).map(([id, v]) => ({ ...publicReview(id, parse(v)), up: Math.max(0, Number(vc[`${id}:u`]) || 0), down: Math.max(0, Number(vc[`${id}:d`]) || 0) })).sort((a, b) => b.ts - a.ts);
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

// Cấp lại mã cho thành viên mất hết phiên đăng nhập. Quản trị viên tự xác minh chủ tài khoản ngoài hệ thống (Discord).
// Mã mới chỉ trả về đây một lần; mọi thiết bị cũ của thành viên bị đăng xuất. Không áp dụng cho tài khoản quản trị.
export async function adminResetCode(ctx, { token, name }) {
  if (!(await requireAdmin(ctx, token))) return err('forbidden', 'Không có quyền.');
  const n = checkName(name, { allowReserved: true });
  if (!n.ok) return n;
  const acct = await getAcct(ctx, n.key);
  if (!acct) return err('not_found', 'Không tìm thấy tài khoản.');
  if (acct.admin) return err('forbidden', 'Không cấp lại mã cho tài khoản quản trị.');
  const { code, salt, hash } = await newSecret(ctx);
  for (const h of acct.devices) await ctx.store.del(sessKey(h));
  await putAcct(ctx, n.key, { ...acct, salt, hash, devices: [] });
  await ctx.store.del(`lock:${n.key}`); // gỡ khóa đoán mã nếu có
  return ok({ code, name: acct.name });
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
