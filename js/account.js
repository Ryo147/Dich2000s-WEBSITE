/* =========================================================
   Trang Cài đặt tài khoản (tai-khoan.html): vẽ vào #account-root.
   Gồm: sửa tên, xem lại đánh giá của mình, đăng xuất thiết bị này, xóa tài khoản.
   Chưa đăng nhập thì hiện ô đăng nhập bằng tên + mã 3 từ. Nội dung người dùng luôn gán bằng textContent.
   ========================================================= */
(function () {
  'use strict';

  var BASE = ''; // gốc site; trang /en/... dùng chung API
  var API = BASE + '/api/ratings';
  var GAMES = window.D2K_GAMES || {}; // js/games.js (sinh từ lib/games.js)
  var T = function (k, v) { return window.d2kT ? window.d2kT(k, v) : k; };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function post(body) {
    var done = window.d2kBusy(document.getElementById('account-root'));
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, message: T('rv.neterr') }; })
      .then(function (r) { done(); return r; });
  }

  function errText(r) {
    var key = 'err.' + r.code, s = T(key);
    return s !== key ? s : (r.message || T('rv.neterr'));
  }

  function field(label, input) {
    return el('label', { class: 'block text-sm' }, [el('span', { class: 'block mb-1 text-muted-foreground', text: label }), input]);
  }
  var INPUT = 'w-full rounded-lg border border-border bg-background px-3 py-2';
  var BTN = 'rounded-full border border-border px-4 py-2 text-sm hover:bg-card';

  function render(box, data, note, code, bad) {
    box.textContent = '';
    var msg = el('p', { class: 'text-sm mt-3', role: 'status' });
    var say = function (t, bad) { msg.textContent = t; msg.className = 'text-sm mt-3 ' + (bad ? 'text-red-400' : 'text-green-400'); };

    if (!data) { // chưa đăng nhập
      var n = el('input', { type: 'text', maxlength: '24', autocomplete: 'nickname', class: INPUT });
      var c = el('input', { type: 'text', autocomplete: 'off', class: INPUT });
      // Chỉ hiện khi đăng nhập bị chặn vì đủ 2 thiết bị: xác thực bằng chính tên + mã vừa nhập rồi gỡ hết và đăng nhập lại
      var resetBtn = el('button', { type: 'button', hidden: '', class: BTN, text: T('acc.device.resetlogin'), onclick: function () {
        if (!window.confirm(T('acc.device.confirmall'))) return;
        post({ action: 'reset-devices', name: n.value, code: c.value }).then(function (r) {
          if (!r.ok) return say(errText(r), true);
          post({ action: 'login', name: n.value, code: c.value }).then(function (l) { if (!l.ok) return say(errText(l), true); load(box); });
        });
      } });
      box.appendChild(el('p', { class: 'text-sm text-muted-foreground mb-4', text: T('acc.loggedout') }));
      box.appendChild(el('div', { class: 'space-y-3' }, [field(T('rv.yourname'), n), field(T('rv.code'), c),
        el('div', { class: 'flex flex-wrap gap-2' }, [
          el('button', { type: 'button', class: BTN, text: T('rv.login'), onclick: function () {
            post({ action: 'login', name: n.value, code: c.value }).then(function (r) {
              if (!r.ok) { resetBtn.hidden = r.code !== 'device_limit'; return say(errText(r), true); }
              load(box);
            });
          } }),
          resetBtn,
        ])]));
      if (box.d2kMail) { // máy chủ đã bật email: quên mã thì nhận mã mới qua email đã xác minh
        var fn = el('input', { type: 'text', maxlength: '24', autocomplete: 'nickname', class: INPUT });
        var fe = el('input', { type: 'email', maxlength: '254', autocomplete: 'email', class: INPUT });
        box.appendChild(el('section', { class: 'mt-8' }, [
          el('h3', { class: 'font-semibold mb-2', text: T('acc.forgot.mail.title') }),
          el('p', { class: 'text-xs text-muted-foreground mb-2', text: T('acc.forgot.mail.hint') }),
          el('div', { class: 'space-y-3' }, [field(T('rv.yourname'), fn), field(T('acc.email.label'), fe),
            el('button', { type: 'button', class: BTN, text: T('acc.forgot.mail.btn'), onclick: function () {
              post({ action: 'rotate-mail-request', name: fn.value, email: fe.value }).then(function (r) { if (!r.ok) return say(errText(r), true); say(T('acc.forgot.mail.sent'), false); });
            } })]),
        ]));
      }
      box.appendChild(el('p', { class: 'text-xs text-muted-foreground mt-4', text: T('acc.forgot') }));
      box.appendChild(el('a', { href: 'https://discord.gg/mxsAU6BDye', target: '_blank', rel: 'noopener noreferrer', class: 'text-xs text-primary hover:underline', text: T('acc.forgot.link') }));
      box.appendChild(msg);
      if (note) say(note, !!bad);
      return;
    }

    var nameIn = el('input', { type: 'text', maxlength: '24', class: INPUT, value: data.name });
    var section = function (title, kids) { return el('section', { class: 'mt-6' }, [el('h3', { class: 'font-semibold mb-2', text: title })].concat(kids)); };
    box.appendChild(el('p', { class: 'text-sm text-muted-foreground', text: T('rv.asname', { name: data.name }) }));
    if (code) { // mã mới (tự tạo hoặc quản trị viên cấp): chỉ hiện một lần
      box.appendChild(el('div', { class: 'mt-4 rounded-lg border border-primary p-3 text-sm' }, [
        el('p', { class: 'font-medium mb-1', text: T('acc.code.title') }),
        el('code', { class: 'block select-all rounded-lg border border-border bg-card px-3 py-2 font-mono', text: code }),
        el('p', { class: 'text-xs text-muted-foreground mt-2', text: T('acc.code.warn') }),
        el('button', { type: 'button', class: BTN + ' mt-2', text: T('rv.copy'), onclick: function (e) {
          var b = e.currentTarget;
          if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { b.textContent = T('rv.copied'); });
        } }),
      ]));
    }

    if (data.admin) box.appendChild(el('p', { class: 'text-xs text-muted-foreground mt-2', text: T('acc.admin') }));
    else box.appendChild(section(T('acc.rename'), [
      field(T('rv.yourname'), nameIn),
      el('p', { class: 'text-xs text-muted-foreground mt-1', text: T('acc.rename.hint') }),
      el('button', { type: 'button', class: BTN + ' mt-2', text: T('acc.save'), onclick: function () {
        post({ action: 'rename', name: nameIn.value }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T('acc.saved')); });
      } }),
    ]));

    var list = el('ul', { class: 'space-y-2' });
    if (!data.reviews.length) list.appendChild(el('li', { class: 'text-sm text-muted-foreground', text: T('acc.noreviews') }));
    data.reviews.forEach(function (r) {
      var g = GAMES[r.game] || { name: r.game, url: 'projects.html' };
      list.appendChild(el('li', { class: 'rounded-lg border border-border p-3 text-sm' }, [
        el('div', { class: 'flex items-center justify-between gap-2' }, [
          el('a', { href: window.d2kHref(g.url) + '#reviews', class: 'font-medium text-primary hover:underline', text: g.name }),
          el('span', { class: 'text-primary inline-flex gap-0.5', role: 'img', 'aria-label': T('rv.star', { n: r.stars }) }, [1, 2, 3, 4, 5].map(function (i) { return el('i', { class: (i <= r.stars ? 'fa-solid' : 'fa-regular') + ' fa-star', 'aria-hidden': 'true' }); })),
        ]),
        r.text ? el('p', { class: 'mt-1 whitespace-pre-wrap break-words ' + (r.removed ? 'italic text-muted-foreground' : ''), text: r.text }) : null,
        el('div', { class: 'mt-2' }, [el('button', { type: 'button', class: 'text-xs underline text-red-400 hover:text-red-300', text: T('acc.review.delete'), onclick: function () {
          if (!window.confirm(T('acc.review.delete.confirm', { game: g.name }))) return;
          post({ action: 'delete-review', game: r.game }).then(function (x) { if (!x.ok) return say(errText(x), true); load(box, T('acc.review.deleted')); });
        } })]),
      ]));
    });
    box.appendChild(section(T('acc.myreviews'), [list]));

    // Quản lý thiết bị: tài khoản chỉ có tên + mã 3 từ nên gỡ thiết bị luôn bắt nhập lại mã để xác thực
    var codeIn = el('input', { type: 'text', autocomplete: 'off', class: INPUT });
    var removeDevice = function (id) {
      if (!codeIn.value.trim()) return say(T('acc.device.needcode'), true);
      if (!id && !window.confirm(T('acc.device.confirmall'))) return;
      post({ action: id ? 'remove-device' : 'reset-devices', name: data.name, code: codeIn.value, id: id }).then(function (r) {
        if (!r.ok) return say(errText(r), true);
        load(box, r.loggedOut ? null : T(id ? 'acc.device.removed' : 'acc.device.removedall'));
      });
    };
    var devs = el('ul', { class: 'space-y-2' });
    (data.devices || []).forEach(function (d) {
      devs.appendChild(el('li', { class: 'rounded-lg border border-border p-3 text-sm flex items-center justify-between gap-2' }, [
        el('div', {}, [
          el('div', { class: 'font-medium', text: T(d.current ? 'acc.device.this' : 'acc.device.other') }),
          el('div', { class: 'text-xs text-muted-foreground', text: d.t ? T('acc.device.since', { t: new Date(d.t).toLocaleString() }) : T('acc.device.nosince') }),
        ]),
        el('button', { type: 'button', class: BTN, text: T('acc.device.remove'), onclick: function () { removeDevice(d.id); } }),
      ]));
    });
    box.appendChild(section(T('acc.devices'), [
      el('p', { class: 'text-xs text-muted-foreground mb-2', text: T('acc.devices.hint') }),
      devs,
      el('div', { class: 'mt-3' }, [field(T('acc.device.code'), codeIn)]),
      el('button', { type: 'button', class: BTN + ' mt-2 text-red-400', text: T('acc.device.removeall'), onclick: function () { removeDevice(null); } }),
    ]));

    // Quên mã: còn phiên đăng nhập thì tự tạo mã mới; mất hết phiên thì nhờ quản trị viên cấp lại (xem form bên dưới, chỉ quản trị viên thấy)
    if (data.mail) { // chỉ hiện khi máy chủ đã cấu hình gửi mail
      var emIn = el('input', { type: 'email', maxlength: '254', autocomplete: 'email', class: INPUT, value: data.pendingEmail || '' });
      var emKids = [el('p', { class: 'text-xs text-muted-foreground mb-2', text: T('acc.email.hint') })];
      if (data.email) emKids.push(el('p', { class: 'text-sm mb-2', text: T('acc.email.current', { email: data.email }) }));
      if (data.pendingEmail) emKids.push(el('p', { class: 'text-sm mb-2', text: T('acc.email.pending', { email: data.pendingEmail }) }));
      var emCode = el('input', { type: 'text', autocomplete: 'off', class: INPUT });
      emKids.push(field(T('acc.email.label'), emIn));
      emKids.push(field(T('acc.device.code'), emCode));
      emKids.push(el('div', { class: 'mt-2 flex flex-wrap gap-2' }, [
        el('button', { type: 'button', class: BTN, text: T('acc.email.send'), onclick: function () {
          if (!emCode.value.trim()) return say(T('acc.device.needcode'), true);
          post({ action: 'set-email', email: emIn.value, code: emCode.value }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T('acc.email.sent')); });
        } }),
        data.email || data.pendingEmail ? el('button', { type: 'button', class: BTN + ' text-red-400', text: T('acc.email.remove'), onclick: function () {
          if (!window.confirm(T('acc.email.remove.confirm'))) return;
          if (!emCode.value.trim()) return say(T('acc.device.needcode'), true);
          post({ action: 'remove-email', code: emCode.value }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T('acc.email.removed')); });
        } }) : null,
      ]));
      box.appendChild(section(T('acc.email'), emKids));
    }

    var rot = data.rotate;
    var when = rot ? new Date(rot.readyAt).toLocaleString(window.d2kLang && window.d2kLang() === 'en' ? 'en-GB' : 'vi-VN') : '';
    var byMail = !!(data.mail && data.email);
    var rotKids = [el('p', { class: 'text-xs text-muted-foreground mb-2', text: T(byMail ? 'acc.rotate.mail.hint' : 'acc.rotate.hint') })];
    var cancelBtn = el('button', { type: 'button', class: BTN, text: T('acc.rotate.cancel'), onclick: function () {
      post({ action: 'rotate-cancel' }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T('acc.rotate.cancelled')); });
    } });
    if (!rot) {
      rotKids.push(el('button', { type: 'button', class: BTN, text: T(byMail ? 'acc.rotate.mail.btn' : 'acc.rotate.btn'), onclick: function () {
        if (!window.confirm(byMail ? T('acc.rotate.mail.confirm', { email: data.email }) : T('acc.rotate.confirm'))) return;
        post({ action: 'rotate-request' }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T(byMail ? 'acc.rotate.mail.requested' : 'acc.rotate.requested')); });
      } }));
    } else if (rot.mail) {
      rotKids.push(el('p', { class: 'text-sm mb-2', text: T('acc.rotate.mail.wait', { time: when }) }), cancelBtn);
    } else if (!rot.mine) {
      rotKids.push(el('p', { class: 'text-sm text-red-400 mb-2', role: 'alert', text: T('acc.rotate.other', { time: when }) }), cancelBtn);
    } else if (Date.now() < rot.readyAt) {
      rotKids.push(el('p', { class: 'text-sm mb-2', text: T('acc.rotate.wait', { time: when }) }), cancelBtn);
    } else {
      rotKids.push(el('button', { type: 'button', class: BTN + ' mr-2', text: T('acc.rotate.finish'), onclick: function () {
        post({ action: 'rotate-finish' }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box, T('acc.rotate.done'), r.code); });
      } }), cancelBtn);
    }
    box.appendChild(section(T('acc.rotate'), rotKids));
    if (data.admin) {
      var whoIn = el('input', { type: 'text', maxlength: '24', class: INPUT });
      box.appendChild(section(T('acc.admin.reset'), [
        el('p', { class: 'text-xs text-muted-foreground mb-2', text: T('acc.admin.reset.hint') }),
        field(T('acc.admin.reset.name'), whoIn),
        el('button', { type: 'button', class: BTN + ' mt-2', text: T('acc.admin.reset.btn'), onclick: function () {
          post({ action: 'admin-reset-code', name: whoIn.value }).then(function (r) {
            if (!r.ok) return say(errText(r), true);
            load(box, T('acc.admin.reset.done', { name: r.name }), r.code);
          });
        } }),
      ]));
    }

    var out = el('button', { type: 'button', class: BTN, text: T('rv.logout'), onclick: function () {
      post({ action: 'logout' }).then(function () { load(box); });
    } });
    var del = data.admin ? null : el('button', { type: 'button', class: BTN + ' text-red-400', text: T('rv.delete'), onclick: function () {
      if (!window.confirm(T('rv.delete.confirm'))) return;
      var dc = window.prompt(T('acc.device.code'));
      if (!dc || !dc.trim()) return;
      post({ action: 'delete-account', code: dc }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box); });
    } });
    box.appendChild(el('div', { class: 'mt-6 flex flex-wrap gap-2' }, [out, del]));
    box.appendChild(msg);
    if (note) say(note, !!bad);
  }

  function load(box, note, code, bad) {
    post({ action: 'my-reviews' }).then(function (r) {
      if (r.ok) return render(box, r, note, code, bad);
      // chưa đăng nhập: hỏi máy chủ có bật email không để quyết định hiện mục "quên mã qua email"
      fetch(API + '?me=1', { credentials: 'same-origin' }).then(function (x) { return x.json(); }).catch(function () { return {}; }).then(function (m) {
        box.d2kMail = !!m.mail; render(box, null, note, code, bad);
      });
    });
  }

  function init() {
    var root = document.getElementById('account-root');
    if (!root) return;
    root.textContent = '…';
    var v = /[?&]verify=([A-Za-z0-9_-]+)/.exec(location.search);
    if (v) { // liên kết trong email xác minh
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* bỏ qua */ }
      post({ action: 'verify-email', token: v[1] }).then(function (r) { load(root, r.ok ? T('acc.email.verified') : errText(r), null, !r.ok); });
    } else if ((v = /[?&](activate|cancel)=([A-Za-z0-9_-]+)/.exec(location.search))) { // liên kết trong email đổi mã
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* bỏ qua */ }
      var act = v[1] === 'activate';
      post({ action: act ? 'rotate-mail-activate' : 'rotate-mail-cancel', token: v[2] }).then(function (r) {
        load(root, r.ok ? T(act ? 'acc.rotate.mail.activated' : 'acc.rotate.mail.cancelled') : errText(r), null, !r.ok);
      });
    } else load(root);
    window.addEventListener('d2k-lang', function () { load(root); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
