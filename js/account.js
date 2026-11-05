/* =========================================================
   Trang Cài đặt tài khoản (tai-khoan.html): vẽ vào #account-root.
   Gồm: sửa tên, xem lại đánh giá của mình, đăng xuất thiết bị này, xóa tài khoản.
   Chưa đăng nhập thì hiện ô đăng nhập bằng tên + mã 3 từ. Nội dung người dùng luôn gán bằng textContent.
   ========================================================= */
(function () {
  'use strict';

  var BASE = location.pathname.indexOf('/projects/') !== -1 ? '..' : '.';
  var API = BASE + '/api/ratings';
  var GAMES = {
    'plague-inc': { name: 'Plague Inc: Evolved', url: 'projects/plague-inc.html' },
    're2-remake': { name: 'Resident Evil 2 Remake', url: 'projects/re2-remake.html' },
    'dmc5': { name: 'Devil May Cry 5', url: 'projects/dmc5.html' },
    'dreamcore_1': { name: 'Dreamcore?', url: 'projects/dreamcore_1.html' },
  };
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
    return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, message: T('rv.neterr') }; });
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

  function render(box, data, note) {
    box.textContent = '';
    var msg = el('p', { class: 'text-sm mt-3', role: 'status' });
    var say = function (t, bad) { msg.textContent = t; msg.className = 'text-sm mt-3 ' + (bad ? 'text-red-400' : 'text-green-400'); };

    if (!data) { // chưa đăng nhập
      var n = el('input', { type: 'text', maxlength: '24', autocomplete: 'nickname', class: INPUT });
      var c = el('input', { type: 'text', autocomplete: 'off', class: INPUT });
      box.appendChild(el('p', { class: 'text-sm text-muted-foreground mb-4', text: T('acc.loggedout') }));
      box.appendChild(el('div', { class: 'space-y-3' }, [field(T('rv.yourname'), n), field(T('rv.code'), c),
        el('button', { type: 'button', class: BTN, text: T('rv.login'), onclick: function () {
          post({ action: 'login', name: n.value, code: c.value }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box); });
        } })]));
      box.appendChild(msg);
      return;
    }

    var nameIn = el('input', { type: 'text', maxlength: '24', class: INPUT, value: data.name });
    var section = function (title, kids) { return el('section', { class: 'mt-6' }, [el('h3', { class: 'font-semibold mb-2', text: title })].concat(kids)); };
    box.appendChild(el('p', { class: 'text-sm text-muted-foreground', text: T('rv.asname', { name: data.name }) }));

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
          el('a', { href: BASE + '/' + g.url + '#reviews', class: 'font-medium text-primary hover:underline', text: g.name }),
          el('span', { class: 'text-primary', 'aria-label': T('rv.star', { n: r.stars }), text: '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars) }),
        ]),
        r.text ? el('p', { class: 'mt-1 whitespace-pre-wrap break-words ' + (r.removed ? 'italic text-muted-foreground' : ''), text: r.text }) : null,
      ]));
    });
    box.appendChild(section(T('acc.myreviews'), [list]));

    var out = el('button', { type: 'button', class: BTN, text: T('rv.logout'), onclick: function () {
      post({ action: 'logout' }).then(function () { load(box); });
    } });
    var del = data.admin ? null : el('button', { type: 'button', class: BTN + ' text-red-400', text: T('rv.delete'), onclick: function () {
      if (!window.confirm(T('rv.delete.confirm'))) return;
      post({ action: 'delete-account' }).then(function (r) { if (!r.ok) return say(errText(r), true); load(box); });
    } });
    box.appendChild(el('div', { class: 'mt-6 flex flex-wrap gap-2' }, [out, del]));
    box.appendChild(msg);
    if (note) say(note, false);
  }

  function load(box, note) {
    post({ action: 'my-reviews' }).then(function (r) { render(box, r.ok ? r : null, note); });
  }

  function init() {
    var root = document.getElementById('account-root');
    if (!root) return;
    root.textContent = '…';
    load(root);
    window.addEventListener('d2k-lang', function () { load(root); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
