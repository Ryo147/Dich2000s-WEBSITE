/* =========================================================
   Đánh giá bản Việt hóa: form + danh sách (trang game), mục ngẫu nhiên (trang chủ),
   sao trung bình (projects.html). Nội dung người dùng luôn gán bằng textContent, không innerHTML.
   Cần api/ratings.js. Lỗi mạng thì ẩn im lặng, không ảnh hưởng phần còn lại của trang.
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
      else if (k === 'i18n') { n.setAttribute('data-i18n', attrs[k]); n.textContent = T(attrs[k]); }
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function api(method, body, query) {
    var opt = { method: method, credentials: 'same-origin' };
    if (body) { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
    return fetch(API + (query || ''), opt).then(function (r) {
      return r.json().catch(function () { return { ok: false, message: T('rv.neterr') }; });
    }).catch(function () { return { ok: false, message: T('rv.neterr') }; });
  }

  function errText(r) {
    var key = 'err.' + r.code;
    var s = T(key);
    return s !== key ? s : (r.message || T('rv.neterr'));
  }

  function stars(n, size) {
    var box = el('span', { class: 'inline-flex gap-0.5 text-primary', role: 'img', 'aria-label': T('rv.star', { n: n }) });
    for (var i = 1; i <= 5; i++) box.appendChild(el('span', { 'aria-hidden': 'true', text: i <= Math.round(n) ? '★' : '☆', style: size ? 'font-size:' + size : '' }));
    return box;
  }

  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(window.d2kLang && window.d2kLang() === 'en' ? 'en-GB' : 'vi-VN'); } catch (e) { return ''; }
  }

  // ---------- Trang game ----------
  function initGame(main) {
    var game = main.getAttribute('data-project-page');
    if (!GAMES[game]) return;
    var sec = el('section', { id: 'reviews', class: 'max-w-4xl mx-auto mt-16 pt-12 border-t border-border', 'aria-labelledby': 'reviews-h' });
    main.appendChild(sec);
    var state = { me: { name: null, admin: false }, data: null, newCode: null, msg: '', msgBad: false, stars: 0, mine: null };

    function load() {
      return Promise.all([api('GET', null, '?me=1'), api('GET', null, '?game=' + encodeURIComponent(game))]).then(function (rs) {
        state.me = rs[0].ok ? rs[0] : { name: null, admin: false };
        state.data = rs[1].ok ? rs[1] : null;
        state.mine = null;
        if (state.me.name && state.data) {
          state.data.reviews.forEach(function (r) { if (r.name.toLowerCase() === state.me.name.toLowerCase()) state.mine = r; });
          if (state.mine && !state.stars) state.stars = state.mine.stars;
        }
        render();
      });
    }

    var msgP = null;
    function paintMsg() {
      if (!msgP) return;
      msgP.textContent = state.msg;
      msgP.className = 'mt-3 text-sm ' + (state.msgBad ? 'text-red-400' : 'text-green-400');
    }
    // chỉ cập nhật dòng thông báo, không vẽ lại form (tránh mất chữ người dùng đã gõ)
    function say(msg, bad) { state.msg = msg; state.msgBad = !!bad; paintMsg(); }

    function summary() {
      var d = state.data;
      var box = el('div', { class: 'flex flex-wrap items-center gap-6 mb-8' });
      if (!d || !d.count) return el('p', { class: 'text-muted-foreground mb-8', text: T('rv.none') });
      box.appendChild(el('div', { class: 'text-center' }, [
        el('div', { class: 'font-display text-5xl font-bold', text: String(d.avg) }),
        stars(d.avg, '1.25rem'),
        el('div', { class: 'text-sm text-muted-foreground mt-1', text: T('rv.count', { n: d.count }) }),
      ]));
      var bars = el('div', { class: 'flex-1 min-w-[200px] space-y-1' });
      for (var s = 5; s >= 1; s--) {
        var pct = d.count ? Math.round((d.dist[s - 1] / d.count) * 100) : 0;
        bars.appendChild(el('div', { class: 'flex items-center gap-2 text-xs text-muted-foreground' }, [
          el('span', { class: 'w-8', text: s + '★' }),
          el('div', { class: 'flex-1 h-2 rounded-full bg-border overflow-hidden' }, [el('div', { class: 'h-full bg-primary', style: 'width:' + pct + '%' })]),
          el('span', { class: 'w-8 text-right', text: String(d.dist[s - 1]) }),
        ]));
      }
      box.appendChild(bars);
      return box;
    }

    function starPicker() {
      var row = el('div', { class: 'flex gap-1', role: 'radiogroup', 'aria-label': T('rv.stars') });
      for (let i = 1; i <= 5; i++) {
        row.appendChild(el('button', {
          type: 'button', role: 'radio', 'aria-checked': String(state.stars === i), 'aria-label': T('rv.star', { n: i }),
          class: 'text-3xl leading-none px-1 rounded focus-visible:outline focus-visible:outline-2 ' + (i <= state.stars ? 'text-primary' : 'text-muted-foreground/50'),
          text: '★', onclick: function () { state.stars = i; render(); },
        }));
      }
      return row;
    }

    function form() {
      var me = state.me;
      var nameIn = el('input', { type: 'text', maxlength: '24', autocomplete: 'nickname', 'data-i18n-ph': 'rv.yourname', placeholder: T('rv.yourname'), class: 'w-full rounded-lg border border-border bg-background px-3 py-2' });
      var textIn = el('textarea', { rows: '4', maxlength: '600', class: 'w-full rounded-lg border border-border bg-background px-3 py-2', 'aria-label': T('rv.comment') });
      if (state.mine) textIn.value = state.mine.removed ? '' : state.mine.text;
      var hp = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', style: 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0' });
      var agree = el('input', { type: 'checkbox', id: 'rv-agree' });
      var f = el('form', { class: 'space-y-4 rounded-2xl border border-border bg-card/40 p-5', novalidate: 'novalidate' }, [
        me.name
          ? el('div', { class: 'flex flex-wrap items-center gap-3 text-sm' }, [
              el('span', { text: T('rv.asname', { name: me.name }) }),
              el('button', { type: 'button', class: 'underline text-muted-foreground hover:text-foreground', text: T('rv.logout'), onclick: function () {
                api('POST', { action: 'logout' }).then(function () { state.stars = 0; state.msg = ''; load(); });
              } }),
            ])
          : el('div', {}, [el('label', { class: 'block text-sm mb-1', text: T('rv.yourname') }), nameIn, el('p', { class: 'text-xs text-muted-foreground mt-1', text: T('rv.name.hint') })]),
        el('div', {}, [el('div', { class: 'text-sm mb-1', text: T('rv.stars') }), starPicker()]),
        el('div', {}, [el('label', { class: 'block text-sm mb-1', text: T('rv.comment') }), textIn]),
        hp,
        el('label', { class: 'flex items-start gap-2 text-sm text-muted-foreground' }, [agree,
          el('span', {}, [T('rv.consent') + ' ', el('a', { href: window.d2kHref('privacy.html'), class: 'underline', text: T('rv.consent.link') }), '.'])]),
        el('p', { class: 'text-xs text-muted-foreground' }, [T('rv.rules') + ' ', el('a', { href: window.d2kHref('noi-quy.html'), class: 'underline', text: T('rv.rules.link') })]),
        el('button', { type: 'submit', class: 'rounded-full bg-primary text-primary-foreground font-semibold px-6 py-2.5', text: state.mine ? T('rv.update') : T('rv.submit') }),
      ]);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!state.stars) return say(T('rv.pickstars'), true);
        if (!me.name && !nameIn.value.trim()) return say(T('rv.needname'), true);
        if (!agree.checked) return say(T('rv.needconsent'), true);
        api('POST', { action: 'rate', game: game, stars: state.stars, text: textIn.value, name: nameIn.value, website: hp.value }).then(function (r) {
          if (!r.ok) return say(errText(r), true);
          state.newCode = r.code || null;
          state.msg = r.updated ? T('rv.updated') : T('rv.sent'); state.msgBad = false;
          load();
        });
      });
      return f;
    }

    function loginBox() {
      if (state.me.name) return null;
      var n = el('input', { type: 'text', maxlength: '24', 'aria-label': T('rv.yourname'), placeholder: T('rv.yourname'), class: 'rounded-lg border border-border bg-background px-3 py-2 flex-1 min-w-[140px]' });
      var c = el('input', { type: 'text', autocomplete: 'off', 'aria-label': T('rv.code'), placeholder: T('rv.code'), class: 'rounded-lg border border-border bg-background px-3 py-2 flex-1 min-w-[180px]' });
      var go = el('button', { type: 'button', class: 'rounded-full border border-border px-5 py-2', text: T('rv.login'), onclick: function () {
        api('POST', { action: 'login', name: n.value, code: c.value }).then(function (r) {
          if (!r.ok) return say(errText(r), true);
          state.msg = ''; load();
        });
      } });
      return el('details', { class: 'mt-3 text-sm' }, [el('summary', { class: 'cursor-pointer text-muted-foreground', text: T('rv.haveaccount') }),
        el('div', { class: 'flex flex-wrap gap-2 mt-2' }, [n, c, go])]);
    }

    function codeBox() {
      if (!state.newCode) return null;
      var code = state.newCode;
      return el('div', { class: 'rounded-2xl border border-primary/60 bg-primary/10 p-5 mb-4', role: 'alert' }, [
        el('div', { class: 'font-semibold mb-2', text: T('rv.newcode.title') }),
        el('div', { class: 'font-mono text-xl mb-2 select-all', text: code }),
        el('p', { class: 'text-sm text-muted-foreground mb-3', text: T('rv.newcode.warn') }),
        el('button', { type: 'button', class: 'rounded-full border border-border px-4 py-1.5 text-sm', text: T('rv.copy'), onclick: function (e) {
          var b = e.currentTarget;
          (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { b.textContent = T('rv.copied'); }, function () {});
        } }),
      ]);
    }

    function list() {
      var box = el('ul', { class: 'mt-8 space-y-4' });
      ((state.data && state.data.reviews) || []).forEach(function (r) {
        var actions = el('div', { class: 'flex gap-3 text-xs text-muted-foreground' });
        actions.appendChild(el('button', { type: 'button', class: 'underline hover:text-foreground', text: T('rv.report'), onclick: function (e) {
          var b = e.currentTarget;
          api('POST', { action: 'report', game: game, id: r.id }).then(function (x) { if (x.ok) { b.textContent = T('rv.reported'); b.disabled = true; } });
        } }));
        if (state.me.admin) {
          actions.appendChild(el('button', { type: 'button', class: 'underline hover:text-foreground', text: r.removed ? T('rv.admin.restore') : T('rv.admin.remove'), onclick: function () {
            api('POST', { action: r.removed ? 'admin-restore' : 'admin-remove', game: game, id: r.id }).then(load);
          } }));
        }
        box.appendChild(el('li', { class: 'rounded-xl border border-border p-4' }, [
          el('div', { class: 'flex flex-wrap items-center gap-2 mb-1' }, [
            el('span', { class: 'font-semibold', text: r.name }), stars(r.stars),
            el('span', { class: 'text-xs text-muted-foreground', text: fmtDate(r.ts) + (r.edited ? ' ' + T('rv.edited') : '') }),
          ]),
          r.text ? el('p', { class: 'whitespace-pre-wrap break-words ' + (r.removed ? 'italic text-muted-foreground' : ''), text: r.text }) : null,
          actions,
        ]));
      });
      return box;
    }

    function render() {
      sec.textContent = '';
      var del = state.me.name && !state.me.admin
        ? el('button', { type: 'button', class: 'mt-3 text-xs underline text-muted-foreground hover:text-foreground', text: T('rv.delete'), onclick: function () {
            if (!window.confirm(T('rv.delete.confirm'))) return;
            api('POST', { action: 'delete-account' }).then(function () { state.stars = 0; state.msg = ''; load(); });
          } }) : null;
      [
        el('h2', { id: 'reviews-h', class: 'font-display text-2xl sm:text-3xl font-semibold mb-6', text: T('rv.title') }),
        summary(), codeBox(), form(), loginBox(), del,
        (msgP = el('p', { role: 'status' })),
        list(),
      ].forEach(function (n) { if (n) sec.appendChild(n); });
      paintMsg();
    }

    window.addEventListener('d2k-lang', render);
    load();
  }

  // ---------- Trang chủ: đánh giá ngẫu nhiên ----------
  function initFeatured(sec) {
    api('GET', null, '?featured=1').then(function (r) {
      if (!r.ok || !r.reviews || !r.reviews.length) return;
      var grid = sec.querySelector('[data-featured-grid]');
      grid.textContent = '';
      r.reviews.forEach(function (v) {
        var g = GAMES[v.game] || { name: v.game, url: 'projects.html' };
        grid.appendChild(el('li', { class: 'rounded-2xl border border-border bg-card/40 p-5 flex flex-col gap-2' }, [
          el('a', { href: g.url + '#reviews', class: 'text-xs font-mono text-primary hover:underline', text: g.name }),
          stars(v.stars),
          el('p', { class: 'text-sm whitespace-pre-wrap break-words line-clamp-6', text: v.text }),
          el('div', { class: 'text-xs text-muted-foreground mt-auto', text: v.name }),
        ]));
      });
      sec.hidden = false;
    });
  }

  // ---------- projects.html: sao trung bình ----------
  function initAverages(nodes) {
    Object.keys(GAMES).forEach(function (slug) {
      api('GET', null, '?game=' + slug).then(function (r) {
        if (!r.ok) return;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].getAttribute('data-avg-project') === slug) nodes[i].textContent = r.count ? r.avg + ' (' + r.count + ')' : '—';
        }
      });
    });
  }

  function init() {
    var main = document.querySelector('[data-project-page]');
    if (main) initGame(main);
    var f = document.getElementById('featured-reviews');
    if (f) initFeatured(f);
    var avgs = document.querySelectorAll('[data-avg-project]');
    if (avgs.length) initAverages(avgs);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
