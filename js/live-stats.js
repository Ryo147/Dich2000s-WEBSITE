/* =========================================================
   Live stats cho Dịch 2000s: đang online + tổng lượt xem
   + lượt xem theo từng project. Cần Upstash Redis đã kết nối
   qua Vercel (biến môi trường UPSTASH_REDIS_REST_URL/TOKEN).
   Nếu API lỗi (chưa setup Redis...), script fail im lặng,
   không ảnh hưởng phần còn lại của trang.
   ========================================================= */
(function () {
  'use strict';

  var API_BASE = location.pathname.indexOf('/projects/') !== -1 ? '..' : '.';
  var HEARTBEAT_INTERVAL_MS = 30000;
  var POLL_INTERVAL_MS = 30000;
  var VISITOR_KEY = 'd2k_vid';

  function consented() {
    try { return localStorage.getItem('d2k_consent') === 'granted'; } catch (e) { return false; }
  }

  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch (e) {
      // localStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt...)
      return 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
  }

  function currentPageKey() {
    // Chuẩn hoá path để cùng 1 trang luôn ra cùng 1 key dedupe
    var path = location.pathname.replace(/\/+$/, '') || '/';
    return path.toLowerCase();
  }

  function currentProjectSlug() {
    var el = document.querySelector('[data-project-page]');
    return el ? el.getAttribute('data-project-page') : null;
  }

  function formatNum(n) {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    return n.toLocaleString('vi-VN');
  }

  function paintStats(stats) {
    var onlineEls = document.querySelectorAll('[data-stat="online"]');
    for (var i = 0; i < onlineEls.length; i++) {
      onlineEls[i].textContent = formatNum(stats.online);
    }

    var globalEls = document.querySelectorAll('[data-stat="views-global"]');
    for (var j = 0; j < globalEls.length; j++) {
      globalEls[j].textContent = formatNum(stats.views.global);
    }

    var projectEls = document.querySelectorAll('[data-stat-project]');
    for (var k = 0; k < projectEls.length; k++) {
      var slug = projectEls[k].getAttribute('data-stat-project');
      var v = stats.views.projects[slug];
      projectEls[k].textContent = formatNum(typeof v === 'number' ? v : 0);
    }
  }

  function fetchStats() {
    fetch(API_BASE + '/api/stats')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) paintStats(data); })
      .catch(function () { /* im lặng bỏ qua, giữ trang chạy bình thường */ });
  }

  function trackView() {
    if (!consented()) return;
    var project = currentProjectSlug();
    fetch(API_BASE + '/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: project,
        page: currentPageKey(),
        visitorId: getVisitorId()
      })
    }).catch(function () {});
  }

  function heartbeat() {
    if (!consented()) return;
    fetch(API_BASE + '/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: getVisitorId() })
    }).catch(function () {});
  }

  function init() {
    trackView();
    heartbeat();
    fetchStats();

    // tab ẩn thì không gọi API: tiết kiệm lệnh Redis, và người đó không còn xem trang
    setInterval(function () { if (document.visibilityState === 'visible') heartbeat(); }, HEARTBEAT_INTERVAL_MS);
    setInterval(function () { if (document.visibilityState === 'visible') fetchStats(); }, POLL_INTERVAL_MS);

    // vừa bấm Chấp nhận: bắt đầu đếm ngay (không cần tải lại trang)
    window.addEventListener('d2k-consent', function (e) {
      if (e.detail === 'granted') { trackView(); heartbeat(); }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        heartbeat();
        fetchStats();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
