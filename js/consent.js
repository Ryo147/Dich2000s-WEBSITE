/* =========================================================
   Banner cookie + nạp Google Analytics có điều kiện.
   GA chỉ được tải SAU KHI người dùng bấm "Chấp nhận".
   Lựa chọn lưu trong localStorage (khóa d2k_consent).
   Đổi ý: window.d2kCookieSettings() (nút ở trang Chính sách bảo mật).
   ========================================================= */
(function () {
  'use strict';

  var GA_ID = 'G-5D3W8D9JH1';
  var KEY = 'd2k_consent';
  var gaLoaded = false;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* bị chặn: chỉ nhớ trong phiên này */ }
  }

  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  // Từ chối sau khi từng chấp nhận: tắt GA và xóa cookie _ga* do GA đặt.
  function stopGA() {
    window['ga-disable-' + GA_ID] = true;
    var host = location.hostname.split('.');
    var domains = ['', location.hostname];
    for (var i = 1; i < host.length - 1; i++) domains.push('.' + host.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function injectStyle() {
    if (document.getElementById('d2k-consent-style')) return;
    var st = document.createElement('style');
    st.id = 'd2k-consent-style';
    st.textContent =
      '#d2k-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:720px;margin:0 auto;' +
      'background:var(--card,#161618);color:var(--foreground,#f5f5f5);border:1px solid rgba(255,255,255,.14);' +
      'border-radius:16px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.5);' +
      'display:flex;flex-wrap:wrap;gap:14px 20px;align-items:center;font-size:14px;line-height:1.55}' +
      '#d2k-consent p{margin:0;flex:1 1 320px}' +
      '#d2k-consent a{color:var(--primary,#ff7a2f);text-decoration:underline}' +
      '#d2k-consent .d2k-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '#d2k-consent button{font:inherit;font-weight:600;padding:10px 18px;border-radius:999px;cursor:pointer;' +
      'border:1px solid rgba(255,255,255,.25);background:transparent;color:var(--foreground,#f5f5f5)}' +
      '#d2k-consent button.d2k-yes{background:var(--primary,#ff7a2f);border-color:var(--primary,#ff7a2f);' +
      'color:var(--primary-foreground,#0a0a0b)}' +
      '#d2k-consent button:focus-visible{outline:2px solid var(--primary,#ff7a2f);outline-offset:3px}' +
      '@media (max-width:520px){#d2k-consent .d2k-btns{width:100%}#d2k-consent button{flex:1}}';
    document.head.appendChild(st);
  }

  function hideBanner() {
    var b = document.getElementById('d2k-consent');
    if (b) b.remove();
  }

  function choose(v) {
    write(v);
    hideBanner();
    if (v === 'granted') loadGA(); else stopGA();
  }

  function showBanner() {
    if (document.getElementById('d2k-consent')) return;
    injectStyle();
    var base = location.pathname.indexOf('/projects/') !== -1 ? '../' : '';
    var box = document.createElement('div');
    box.id = 'd2k-consent';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Thông báo cookie');
    box.innerHTML =
      '<p>Website dùng Google Analytics (cookie) để thống kê lượt truy cập. Dữ liệu chỉ được gửi cho Google khi bạn chấp nhận. ' +
      '<a href="' + base + 'privacy.html">Xem chính sách bảo mật</a>.</p>' +
      '<div class="d2k-btns"><button type="button" class="d2k-no">Từ chối</button>' +
      '<button type="button" class="d2k-yes">Chấp nhận</button></div>';
    box.querySelector('.d2k-yes').addEventListener('click', function () { choose('granted'); });
    box.querySelector('.d2k-no').addEventListener('click', function () { choose('denied'); });
    document.body.appendChild(box);
  }

  window.d2kCookieSettings = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* bỏ qua */ }
    showBanner();
  };

  var saved = read();
  if (saved === 'granted') loadGA();
  else if (saved !== 'denied') showBanner();
})();
