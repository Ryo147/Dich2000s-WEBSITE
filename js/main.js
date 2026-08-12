/* =========================================================
   DỊCH 2000s — main script (static build)
   Handles: nav scroll state, mobile menu, reveal-on-scroll,
   lightbox gallery, progress ring/linear animation, project
   filters, OS tabs, copy-to-clipboard, GitHub download count.
   ========================================================= */
(function () {
  'use strict';

  // ===== Nav scroll state =====
  var nav = document.querySelector('nav.fixed');
  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 8) nav.classList.add('nav-scrolled');
      else nav.classList.remove('nav-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ===== Mobile menu =====
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    var toggleMenu = function () {
      mobileMenu.classList.toggle('hidden');
      document.body.style.overflow = mobileMenu.classList.contains('hidden') ? '' : 'hidden';
    };
    menuBtn.addEventListener('click', toggleMenu);
    mobileMenu.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', function () {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
      });
    });
  }

  // ===== Reveal on scroll =====
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      revealEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('is-visible');
        } else {
          observer.observe(el);
        }
      });
    }
  }

  // ===== Toast helper =====
  window.showToast = function (message, duration) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    if (message) toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, duration || 3000);
  };

  // ===== Copy to clipboard =====
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          window.showToast('Đã sao chép!');
        }).catch(function () {
          window.showToast('Không thể sao chép, vui lòng copy thủ công.');
        });
      } else {
        window.showToast('Không thể sao chép, vui lòng copy thủ công.');
      }
    });
  });

  // ===== Progress ring animation =====
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateProgressRing(el) {
    var target = parseInt(el.getAttribute('data-percent'), 10);
    if (isNaN(target)) return;
    var status = el.getAttribute('data-status') || 'wip';
    var size = parseInt(el.getAttribute('data-size'), 10) || 120;
    var stroke = parseInt(el.getAttribute('data-stroke'), 10) || 8;
    var radius = (size - stroke) / 2;
    var circumference = 2 * Math.PI * radius;
    var fillCircle = el.querySelector('.progress-ring-fill');
    var valueEl = el.querySelector('.progress-ring-value');

    if (!fillCircle || !valueEl) return;

    var colorVar = {
      done: 'var(--status-done)',
      wip: 'var(--status-wip)',
      plan: 'var(--status-plan)',
      other: 'var(--status-other)',
    }[status] || 'var(--status-wip)';
    fillCircle.style.stroke = colorVar;
    fillCircle.style.filter = 'drop-shadow(0 0 6px ' + colorVar + '40)';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      fillCircle.style.strokeDashoffset = circumference - (target / 100) * circumference;
      valueEl.textContent = target + '%';
      return;
    }

    var startTime = 0;
    var DURATION = 1400;
    function tick(now) {
      if (!startTime) startTime = now;
      var t = Math.min((now - startTime) / DURATION, 1);
      var eased = easeOutCubic(t);
      var current = target * eased;
      fillCircle.style.strokeDashoffset = circumference - (current / 100) * circumference;
      valueEl.textContent = Math.round(current) + '%';
      if (t < 1) requestAnimationFrame(tick);
      else valueEl.textContent = target + '%';
    }
    requestAnimationFrame(tick);
  }

  var progressRings = document.querySelectorAll('.progress-ring-wrap');
  if (progressRings.length) {
    var ringObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateProgressRing(entry.target);
          ringObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    progressRings.forEach(function (el) {
      var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var rect = el.getBoundingClientRect();
      if (prefersReducedMotion || rect.top < window.innerHeight) {
        animateProgressRing(el);
      } else {
        ringObserver.observe(el);
      }
    });
  }

  // ===== Progress linear animation =====
  function animateProgressLinear(el) {
    var target = parseInt(el.getAttribute('data-percent'), 10);
    if (isNaN(target)) return;
    var status = el.getAttribute('data-status') || 'wip';
    var fill = el.querySelector('.progress-linear-fill');
    var valueEl = el.querySelector('.progress-linear-value');
    if (!fill) return;

    var colorVar = {
      done: 'var(--status-done)',
      wip: 'var(--status-wip)',
      plan: 'var(--status-plan)',
      other: 'var(--status-other)',
    }[status] || 'var(--status-wip)';
    fill.style.background = colorVar;
    fill.style.boxShadow = '0 0 8px ' + colorVar + '80';
    if (valueEl) valueEl.style.color = colorVar;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      fill.style.width = target + '%';
      if (valueEl) valueEl.textContent = target + '%';
      return;
    }

    var startTime = 0;
    var DURATION = 1200;
    function tick(now) {
      if (!startTime) startTime = now;
      var t = Math.min((now - startTime) / DURATION, 1);
      var eased = easeOutCubic(t);
      var current = target * eased;
      fill.style.width = current + '%';
      if (valueEl) valueEl.textContent = Math.round(current) + '%';
      if (t < 1) requestAnimationFrame(tick);
      else if (valueEl) valueEl.textContent = target + '%';
    }
    requestAnimationFrame(tick);
  }

  var progressLinears = document.querySelectorAll('.progress-linear');
  if (progressLinears.length) {
    var linearObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateProgressLinear(entry.target);
          linearObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    progressLinears.forEach(function (el) {
      var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var rect = el.getBoundingClientRect();
      if (prefersReducedMotion || rect.top < window.innerHeight) {
        animateProgressLinear(el);
      } else {
        linearObserver.observe(el);
      }
    });
  }

  // ===== Lightbox =====
  (function initLightbox() {
    var groups = document.querySelectorAll('[data-gallery]');
    if (!groups.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML =
      '<div class="lightbox-img-wrap">' +
      '<button type="button" class="lightbox-close" aria-label="Đóng">&times;</button>' +
      '<button type="button" class="lightbox-nav lightbox-prev" aria-label="Ảnh trước">&lsaquo;</button>' +
      '<img src="" alt="Xem ảnh phóng to">' +
      '<button type="button" class="lightbox-nav lightbox-next" aria-label="Ảnh sau">&rsaquo;</button>' +
      '<div class="lightbox-counter"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var imgEl = overlay.querySelector('img');
    var counterEl = overlay.querySelector('.lightbox-counter');
    var closeBtn = overlay.querySelector('.lightbox-close');
    var prevBtn = overlay.querySelector('.lightbox-prev');
    var nextBtn = overlay.querySelector('.lightbox-next');
    var currentList = [];
    var currentIndex = 0;

    function updateNavVisibility() {
      var multi = currentList.length > 1;
      prevBtn.style.display = multi ? 'flex' : 'none';
      nextBtn.style.display = multi ? 'flex' : 'none';
      counterEl.style.display = multi ? 'block' : 'none';
    }

    function show(index) {
      currentIndex = (index + currentList.length) % currentList.length;
      var thumb = currentList[currentIndex];
      var full = thumb.getAttribute('data-full') || '';
      if (!full) {
        var bg = thumb.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (bg) full = bg[1];
      }
      imgEl.src = full || '';
      counterEl.textContent = (currentIndex + 1) + ' / ' + currentList.length;
    }

    function open(list, index) {
      currentList = list;
      updateNavVisibility();
      show(index);
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
      imgEl.src = '';
    }

    groups.forEach(function (group) {
      var thumbs = Array.prototype.slice.call(group.querySelectorAll('.gallery-thumb'));
      thumbs.forEach(function (thumb, i) {
        thumb.addEventListener('click', function () { open(thumbs, i); });
      });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { show(currentIndex + 1); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('show')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(currentIndex - 1);
      if (e.key === 'ArrowRight') show(currentIndex + 1);
    });
  })();

  // ===== Project filters (projects.html) =====
  (function initProjectFilters() {
    var buttons = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('#projectGrid .game-card');
    var emptyState = document.getElementById('emptyState');
    var heading = document.getElementById('pageHeading');
    var subtitle = document.getElementById('pageSubtitle');
    if (!buttons.length) return;

    function applyFilter(btn) {
      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      var visibleCount = 0;
      cards.forEach(function (card) {
        var status = card.getAttribute('data-status');
        var match = status === 'other'
          ? filter === 'other'
          : (filter === 'all' || status === filter);
        card.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      if (emptyState) emptyState.classList.toggle('hidden', visibleCount !== 0);
      if (heading) {
        heading.innerHTML = filter === 'other'
          ? heading.getAttribute('data-other')
          : heading.getAttribute('data-default');
      }
      if (subtitle) {
        subtitle.textContent = filter === 'other'
          ? subtitle.getAttribute('data-other')
          : subtitle.getAttribute('data-default');
      }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { applyFilter(btn); });
    });

    var initialBtn = document.querySelector('.filter-btn.active') || buttons[0];
    if (initialBtn) applyFilter(initialBtn);
  })();

  // ===== OS tabs + detection (download.html) =====
  (function initDownloadPage() {
    var primaryBtn = document.getElementById('primaryDownloadBtn');
    var primaryLabel = document.getElementById('primaryDownloadLabel');
    var osBadge = document.getElementById('osDetectBadge');
    if (!primaryBtn) return;

    var LINKS = {
      windows: 'https://github.com/Ryo147/PatchVietHoaInstaller/releases/download/4.2.0.1/PatchVietHoaInstaller.exe',
      linux: 'https://github.com/Ryo147/PatchVietHoaInstaller/releases/download/4.2.0.1/PatchVietHoaInstaller-linux.zip',
    };
    var LABELS = { windows: 'Tải về cho Windows', linux: 'Tải về cho Linux' };

    function detectOS() {
      var ua = navigator.userAgent || '';
      var platform = navigator.platform || '';
      if (/linux/i.test(ua) && !/android/i.test(ua)) return 'linux';
      if (/win/i.test(platform) || /windows/i.test(ua)) return 'windows';
      return null;
    }

    var detected = detectOS();
    var chosen = detected || 'windows';

    primaryBtn.href = LINKS[chosen];
    if (primaryLabel) primaryLabel.textContent = LABELS[chosen];

    if (detected && osBadge) {
    }

    document.querySelectorAll('.os-choice-btn').forEach(function (btn) {
      if (btn.getAttribute('data-os') === chosen) btn.classList.add('is-recommended');
    });

    // Tab switching (instruction steps + security results)
    function setupTabs(buttonSelector, panelAttr) {
      var buttons = document.querySelectorAll(buttonSelector);
      if (!buttons.length) return;
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var target = btn.getAttribute('data-tab');
          buttons.forEach(function (b) {
            var active = b === btn;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          document.querySelectorAll('[' + panelAttr + ']').forEach(function (panel) {
            panel.classList.toggle('hidden', panel.getAttribute(panelAttr) !== target);
          });
          // Also update primary download button + OS choice highlight
          if (buttonSelector.indexOf('data-tab') !== -1 && buttonSelector.indexOf('data-scan-tab') === -1) {
            primaryBtn.href = LINKS[target];
            if (primaryLabel) primaryLabel.textContent = LABELS[target];
            document.querySelectorAll('.os-choice-btn').forEach(function (b) {
              b.classList.toggle('is-recommended', b.getAttribute('data-os') === target);
            });
          }
        });
      });
    }

    setupTabs('.os-tab-btn[data-tab]:not([data-scan-tab])', 'data-panel');
    setupTabs('.os-tab-btn[data-scan-tab]', 'data-scan-panel');
  })();

  // ===== GitHub download count =====
  (function initGithubDownloadStats() {
    var el = document.getElementById('githubDownloadCount');
    if (!el) return;

    var REPO = 'Ryo147/PatchVietHoaInstaller';
    var CACHE_KEY = 'gh_download_count_cache';
    var CACHE_TTL = 15 * 60 * 1000;

    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.time < CACHE_TTL) {
        el.textContent = Number(cached.count).toLocaleString('vi-VN');
        return;
      }
    } catch (e) {}

    fetch('https://api.github.com/repos/' + REPO + '/releases')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (releases) {
        if (!Array.isArray(releases)) throw new Error('no data');
        var total = releases.reduce(function (sum, r) {
          return sum + (r.assets || []).reduce(function (s, a) {
            return s + (a.download_count || 0);
          }, 0);
        }, 0);
        el.textContent = Number(total).toLocaleString('vi-VN');
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ count: total, time: Date.now() }));
        } catch (e) {}
      })
      .catch(function () { el.textContent = '—'; });
  })();

})();
