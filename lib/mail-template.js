// Khung email HTML thống nhất (bảng + CSS nội tuyến để Gmail/Outlook hiển thị đúng; nền tối cùng màu với website).
// Mọi chữ do người dùng nhập (tên) đều qua esc(). Luôn gửi kèm bản văn bản thuần (text) cho client không hiện HTML.
const SITE = 'https://dich2000s.vercel.app';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const C = { page: '#0a0a0b', card: '#151518', line: '#2a2a30', text: '#e8e8ec', mute: '#a6a6b0', accent: '#ff7a2f', violet: '#c77dff', warnBg: '#2a1c12' };
const FONT = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

const p = (t) => `<p style="${FONT}margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.mute};">${t}</p>`;
const button = (label, href, primary = true) =>
  `<a href="${esc(href)}" style="${FONT}display:inline-block;margin:4px 6px 4px 0;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:700;text-decoration:none;` +
  (primary ? `background:${C.accent};color:#0a0a0b;border:1px solid ${C.accent};` : `background:transparent;color:${C.text};border:1px solid ${C.line};`) + `">${esc(label)}</a>`;
const codeBox = (code) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px;"><tr><td align="center" style="background:${C.page};border:1px dashed ${C.accent};border-radius:12px;padding:18px 12px;">` +
  `<div style="${FONT}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.mute};margin-bottom:8px;">Mã 3 từ mới</div>` +
  `<div style="font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:24px;font-weight:700;color:${C.accent};letter-spacing:1px;">${esc(code)}</div></td></tr></table>`;
const note = (t) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 16px;"><tr><td style="background:${C.warnBg};border-left:3px solid ${C.accent};border-radius:6px;padding:12px 14px;${FONT}font-size:13.5px;line-height:1.55;color:${C.text};">${t}</td></tr></table>`;

// opts: { preheader, heading, greeting, paragraphs[] (HTML đã escape), code, buttons[{label,href,primary}], notes[] (HTML), footer (HTML) }
export function mailHtml(o) {
  const body = [
    o.greeting ? p(o.greeting) : '',
    ...(o.paragraphs || []).map(p),
    o.code ? codeBox(o.code) : '',
    (o.buttons || []).length ? `<div style="margin:10px 0 18px;">${o.buttons.map((b) => button(b.label, b.href, b.primary !== false)).join('')}</div>` : '',
    ...(o.notes || []).map(note),
  ].join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${esc(o.heading)}</title></head>` +
    `<body style="margin:0;padding:0;background:${C.page};">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(o.preheader || o.heading)}</div>` +
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.page};"><tr><td align="center" style="padding:28px 12px;">` +
    `<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;">` +
    `<tr><td style="height:4px;background:${C.accent};background-image:linear-gradient(90deg,${C.violet},${C.accent});font-size:0;line-height:0;">&nbsp;</td></tr>` +
    `<tr><td style="padding:26px 30px 6px;"><a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/assets/FullWidthLogo.png" width="150" alt="Dịch 2000s" style="display:block;border:0;height:auto;color:${C.text};${FONT}font-size:18px;font-weight:700;"></a></td></tr>` +
    `<tr><td style="padding:14px 30px 8px;"><h1 style="${FONT}margin:0 0 16px;font-size:22px;line-height:1.3;color:${C.text};">${esc(o.heading)}</h1>${body}</td></tr>` +
    `<tr><td style="padding:16px 30px 26px;border-top:1px solid ${C.line};${FONT}font-size:12px;line-height:1.6;color:${C.mute};">${o.footer || ''}` +
    `<div style="margin-top:8px;">Email tự động từ <a href="${SITE}" style="color:${C.accent};text-decoration:none;">Dịch 2000s</a>. Bạn có thể gỡ email này trong trang <a href="${SITE}/tai-khoan.html" style="color:${C.accent};text-decoration:none;">Tài khoản</a>.</div></td></tr>` +
    `</table></td></tr></table></body></html>`;
}
