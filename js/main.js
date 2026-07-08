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
        window.showToast('Đã sao chép liên kết!');
      } catch (e) {
        window.showToast('Không thể sao chép, vui lòng copy thủ công.');
      }
    });
  });

  // Terminal dịch thuật ở hero trang chủ
  initHeroTerminal();

});

function initHeroTerminal() {
  const term = document.getElementById('heroTerminal');
  if (!term) return;

  // Các dòng ví dụ, lấy cảm hứng từ 2 dự án đang dịch
  const entries = [
    { file: 'plague_inc/events.txt', en: 'A new outbreak has been reported.', vi: 'Một ổ dịch mới vừa được ghi nhận.' },
    { file: 'plague_inc/ui_menu.txt', en: 'New Game', vi: 'Ván Chơi Mới' },
    { file: 're2_remake/dialogue_leon.txt', en: 'Watch your back down there.', vi: 'Cẩn thận đằng sau lưng đấy.' },
    { file: 're2_remake/notes_diary.txt', en: 'Something is not right in this city.', vi: 'Có gì đó sai sai ở thành phố này.' },
    { file: 'plague_inc/symptoms.txt', en: 'Coughing', vi: 'Ho' },
  ];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    // Không animation: render tĩnh vài dòng cho người dùng ưu tiên giảm chuyển động
    entries.slice(0, 3).forEach(e => {
      term.insertAdjacentHTML('beforeend', `
        <div class="term-line term-prompt">$ dich --file ${e.file}</div>
        <div class="term-line term-en">EN: ${e.en}</div>
        <div class="term-line term-vi">VI: ${e.vi}</div>
      `);
    });
    return;
  }

  let i = 0;

  function addLine(cls) {
    const div = document.createElement('div');
    div.className = 'term-line ' + (cls || '');
    term.appendChild(div);
    return div;
  }

  function scrollBottom() {
    term.scrollTop = term.scrollHeight;
  }

  function typeInto(el, text, speed, done) {
    let idx = 0;
    const cursor = document.createElement('span');
    cursor.className = 'term-cursor';
    function step() {
      el.textContent = text.slice(0, idx);
      el.appendChild(cursor);
      scrollBottom();
      idx++;
      if (idx <= text.length) {
        setTimeout(step, speed);
      } else {
        cursor.remove();
        done && done();
      }
    }
    step();
  }

  function trimOldLines() {
    while (term.children.length > 20) {
      term.removeChild(term.firstChild);
    }
  }

  function runEntry() {
    const e = entries[i % entries.length];
    i++;

    const promptLine = addLine('term-prompt');
    typeInto(promptLine, `$ dich --file ${e.file}`, 16, () => {
      setTimeout(() => {
        const enLine = addLine('term-en');
        typeInto(enLine, `${e.en}`, 12, () => {
          setTimeout(() => {
            const viLine = addLine('term-vi');
            typeInto(viLine, `${e.vi}`, 12, () => {
              scrollBottom();
              trimOldLines();
              setTimeout(runEntry, 1100);
            });
          }, 250);
        });
      }, 250);
    });
  }

  runEntry();
}