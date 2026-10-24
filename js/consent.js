/* =========================================================
   Banner cookie + Google Consent Mode.
   Thẻ Google nằm sẵn trong <head> với analytics_storage = denied;
   chỉ khi người dùng bấm "Chấp nhận" mới cho phép cookie phân tích.
   Lựa chọn lưu trong localStorage (khóa d2k_consent).
   Đổi ý: window.d2kCookieSettings() (nút ở trang Chính sách bảo mật).
   ========================================================= */
(function () {
  'use strict';

  var KEY = 'd2k_consent';

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* bị chặn: chỉ nhớ trong phiên này */ }
  }

  // Thẻ Google (gtag.js) đã nằm sẵn trong <head> với consent mặc định "denied";
  // ở đây chỉ cập nhật trạng thái đồng ý.
  function setAnalytics(granted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    }
  }

  // Từ chối sau khi từng chấp nhận: thu hồi đồng ý và xóa cookie _ga* do GA đặt.
  function stopGA() {
    setAnalytics(false);
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
      '@keyframes d2k-in{from{opacity:0;transform:translateY(28px) scale(.98)}to{opacity:1;transform:none}}' +
      '@keyframes d2k-out{to{opacity:0;transform:translateY(28px) scale(.98)}}' +
      '.d2k-banner{animation:d2k-in .5s cubic-bezier(.16,1,.3,1) both}' +
      '.d2k-banner.d2k-leave{animation:d2k-out .28s ease-in both;pointer-events:none}' +
      '.d2k-banner button{transition:transform .15s ease,background-color .15s ease,border-color .15s ease}' +
      '.d2k-banner button:hover{transform:translateY(-2px)}' +
      '.d2k-banner button:active{transform:translateY(0) scale(.97)}' +
      '@media (prefers-reduced-motion:reduce){.d2k-banner,.d2k-banner.d2k-leave{animation:none}.d2k-banner button{transition:none}.d2k-banner button:hover{transform:none}}' +
      '.d2k-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:720px;margin:0 auto;' +
      'background:var(--card,#161618);color:var(--foreground,#f5f5f5);border:1px solid rgba(255,255,255,.14);' +
      'border-radius:16px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.5);' +
      'display:flex;flex-wrap:wrap;gap:14px 20px;align-items:center;font-size:14px;line-height:1.55}' +
      '.d2k-banner p{margin:0;flex:1 1 320px}' +
      '.d2k-banner a{color:var(--primary,#ff7a2f);text-decoration:underline}' +
      '.d2k-banner .d2k-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '.d2k-banner button{font:inherit;font-weight:600;padding:10px 18px;border-radius:999px;cursor:pointer;' +
      'border:1px solid rgba(255,255,255,.25);background:transparent;color:var(--foreground,#f5f5f5)}' +
      '.d2k-banner button.d2k-yes{background:var(--primary,#ff7a2f);border-color:var(--primary,#ff7a2f);' +
      'color:var(--primary-foreground,#0a0a0b)}' +
      '.d2k-banner button:focus-visible{outline:2px solid var(--primary,#ff7a2f);outline-offset:3px}' +
      '@media (max-width:520px){.d2k-banner .d2k-btns{width:100%}.d2k-banner button{flex:1}}';
    document.head.appendChild(st);
  }

  function hideBanner() {
    var b = document.getElementById('d2k-consent');
    if (!b) return;
    b.removeAttribute('id'); // để showBanner() có thể tạo banner mới ngay cả khi bản cũ còn đang mờ dần
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { b.remove(); return; }
    b.classList.add('d2k-leave');
    setTimeout(function () { b.remove(); }, 320);
  }

  function choose(v) {
    write(v);
    hideBanner();
    if (v === 'granted') setAnalytics(true); else stopGA();
  }

  function showBanner() {
    if (document.getElementById('d2k-consent')) return;
    injectStyle();
    var base = location.pathname.indexOf('/projects/') !== -1 ? '../' : '';
    var box = document.createElement('div');
    box.id = 'd2k-consent';
    box.className = 'd2k-banner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Thông báo cookie');
    box.innerHTML =
      '<p>Website dùng Google Analytics để thống kê lượt truy cập. Bấm Chấp nhận để cho phép cookie phân tích; nếu từ chối, Google chỉ nhận tín hiệu ẩn danh, không đặt cookie. ' +
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

  // Đã chọn "granted": thẻ trong <head> đã cập nhật consent từ đầu, không cần làm lại.
  var saved = read();
  if (saved !== 'granted' && saved !== 'denied') showBanner();
})();
