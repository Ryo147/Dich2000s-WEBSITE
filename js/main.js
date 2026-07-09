/* =========================================================
   DỊCH 2000s — script dùng chung cho toàn bộ website
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  // Mobile menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    mobileMenu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => mobileMenu.classList.add('hidden'))
    );
  }

  // Reveal on scroll - đơn giản, nhẹ
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    revealEls.forEach(el => {
      // Nếu phần tử đã nằm trong hoặc phía trên khung nhìn lúc trang vừa tải
      // (ví dụ: F5 khiến trình duyệt khôi phục vị trí cuộn cũ), hiện ngay lập
      // tức thay vì chờ observer bắt sự kiện cuộn — tránh bị "mất" nội dung.
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight) {
        el.classList.add('visible');
      } else {
        observer.observe(el);
      }
    });
  }

  // Toast helper dùng chung (ví dụ: copy link thành công)
  window.showToast = function (message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (message) toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  };

  // Nút copy link (nếu có trên trang)
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
        window.showToast('Đã sao chép!');
      } catch (e) {
        window.showToast('Không thể sao chép, vui lòng copy thủ công.');
      }
    });
  });

  // Lightbox zoom ảnh trong gallery
  initGalleryLightbox();

    // Thanh nạp tiếng Việt ở hero trang chủ
  initHeroLoader();

  // Thống kê lượt tải GitHub
  initGithubDownloadStats();

});

function initGalleryLightbox() {
  // Gom các thumbnail theo từng nhóm gallery (data-gallery trên div cha)
  const groups = document.querySelectorAll('[data-gallery]');
  if (!groups.length) return;

  // Tạo sẵn overlay 1 lần, dùng chung cho toàn trang
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `
    <div class="lightbox-img-wrap">
      <button type="button" class="lightbox-close" aria-label="Đóng">×</button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Ảnh trước">‹</button>
      <img src="" alt="Xem ảnh phóng to">
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Ảnh sau">›</button>
      <div class="lightbox-counter"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const imgEl = overlay.querySelector('img');
  const counterEl = overlay.querySelector('.lightbox-counter');
  const closeBtn = overlay.querySelector('.lightbox-close');
  const prevBtn = overlay.querySelector('.lightbox-prev');
  const nextBtn = overlay.querySelector('.lightbox-next');

  let currentList = [];
  let currentIndex = 0;

  function updateNavVisibility() {
    const multi = currentList.length > 1;
    prevBtn.style.display = multi ? 'flex' : 'none';
    nextBtn.style.display = multi ? 'flex' : 'none';
    counterEl.style.display = multi ? 'block' : 'none';
  }

  function show(index) {
    currentIndex = (index + currentList.length) % currentList.length;
    const thumb = currentList[currentIndex];
    const full = thumb.getAttribute('data-full') ||
      (thumb.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/) || [])[1];
    imgEl.src = full || '';
    counterEl.textContent = `${currentIndex + 1} / ${currentList.length}`;
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

  groups.forEach(group => {
    const thumbs = Array.from(group.querySelectorAll('.gallery-thumb'));
    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => open(thumbs, i));
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(currentIndex - 1));
  nextBtn.addEventListener('click', () => show(currentIndex + 1));

  // Click ra ngoài ảnh (nền overlay) để đóng
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Bàn phím: ESC đóng, ←/→ chuyển ảnh
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
}
// Thanh nạp tiếng Việt ở hero trang chủ
function initHeroLoader() {
  const fill = document.getElementById('loadbarFill');
  const percentEl = document.getElementById('loadPercent');
  const fileEl = document.getElementById('loadFile');
  if (!fill || !percentEl || !fileEl) return;

  const files = [
    'plague_inc/events.txt',
    'plague_inc/scenarios.txt',
    'plague_inc/thecure.txt',
    'plague_inc/xenolith.txt',
    'plague_inc/outbreak.txt',
    're2_remake/leon.txt',
    're2_remake/claire.txt',
    're2_remake/the_4th_survivors.txt',
    're2_remake/files.txt',
    're2_remake/records.txt',
  ];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fileIndex = 0;

  if (reduceMotion) {
    fileEl.textContent = files[0];
    fill.style.width = '100%';
    percentEl.textContent = '100%';
    return;
  }

  function run() {
    fileEl.textContent = files[fileIndex % files.length];
    fileIndex++;

    let pct = 0;
    fill.style.width = '0%';
    percentEl.textContent = '0%';

    function tick() {
      // Tốc độ nạp biến thiên: có lúc vọt nhanh, có lúc khựng lại như cài đặt thật
      const burst = Math.random() < 0.15;           // ~15% khả năng "khựng" rồi vọt
      const step = burst
        ? Math.floor(Math.random() * 3) + 1          // khựng: nhích rất ít
        : Math.floor(Math.random() * 9) + 3;         // bình thường: nhích 3–11%
      const delay = burst
        ? Math.random() * 500 + 350                   // khựng: chờ lâu (350–850ms)
        : Math.random() * 120 + 40;                    // bình thường: nhanh (40–160ms)

      pct = Math.min(pct + step, 100);
      fill.style.width = pct + '%';
      percentEl.textContent = pct + '%';

      if (pct < 100) {
        setTimeout(tick, delay);
      } else {
        setTimeout(() => run(), 700);
      }
    }

    setTimeout(tick, Math.random() * 120 + 40);
  }

  run();
}

// Thống kê lượt tải release trên GitHub
function initGithubDownloadStats() {
  const el = document.getElementById('githubDownloadCount');
  if (!el) return;

  const REPO = 'Ryo147/PatchVietHoaInstaller';
  const CACHE_KEY = 'gh_download_count_cache';
  const CACHE_TTL = 60 * 60 * 1000; // 1 giờ — tránh gọi API liên tục, GitHub giới hạn 60 req/giờ/IP cho request không xác thực

  function render(count) {
    el.textContent = count.toLocaleString('vi-VN');
  }

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      render(cached.count);
      return;
    }
  } catch (e) {}

  fetch(`https://api.github.com/repos/${REPO}/releases`)
    .then(res => {
      if (!res.ok) throw new Error('GitHub API error');
      return res.json();
    })
    .then(releases => {
      const total = releases.reduce((sum, release) => {
        const assetsSum = (release.assets || []).reduce((s, a) => s + (a.download_count || 0), 0);
        return sum + assetsSum;
      }, 0);
      render(total);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ count: total, time: Date.now() }));
      } catch (e) {}
    })
    .catch(() => {
      el.textContent = '—'; // API lỗi hoặc bị rate-limit thì hiện gạch ngang thay vì số sai
    });
}