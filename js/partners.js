(function () {
  'use strict';

  // ============================================================
  // [KHU VỰC TEAM] Danh sách đối tác — sửa/thêm/xoá tại đây.
  // ============================================================
  var PARTNERS = [
    { name: 'VD - yêu em say em quên lối về', logo: '../assets/partners/vd.jpg', url: 'https://www.facebook.com/profile.php?id=61574231851290' },
    { name: 'VD - yêu em say em quên lối về', logo: '../assets/partners/vd.jpg', url: 'https://www.facebook.com/profile.php?id=61574231851290' },
    { name: 'VD - yêu em say em quên lối về', logo: '../assets/partners/vd.jpg', url: 'https://www.facebook.com/profile.php?id=61574231851290' },
  ];
  // ============================================================

  var TRANSITION_MS = 380;

  var stage = document.getElementById('partnerStage');
  var prevBtn = document.getElementById('partnerPrevBtn');
  var nextBtn = document.getElementById('partnerNextBtn');

  if (!stage || !prevBtn || !nextBtn || PARTNERS.length === 0) return;

  var currentIndex = 0;
  var isAnimating = false;
  var slots = {}; // { prev, current, next } -> phần tử DOM tương ứng

  function wrap(i) {
    return ((i % PARTNERS.length) + PARTNERS.length) % PARTNERS.length;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function partnerInnerHTML(partner) {
    var safeName = escapeHtml(partner.name);
    return (
      '<a href="' + partner.url + '" target="_blank" rel="noopener noreferrer" class="partner-row">' +
        '<span class="partner-logo-circle"><img src="' + partner.logo + '" alt="Logo ' + safeName + '" loading="lazy"></span>' +
        '<span class="partner-name-text">' + safeName + '</span>' +
      '</a>'
    );
  }

  function bindNav(el, handler) {
    var link = el.querySelector('a');
    if (link) {
      link.addEventListener('click', function (e) {
        if (!el.classList.contains('role-current')) {
          e.preventDefault();
          handler();
        }
      });
    }
  }

  function makeSlotEl(partnerIndex, roleClass) {
    var el = document.createElement('div');
    el.className = 'partner-slot ' + roleClass;
    el.dataset.index = String(partnerIndex);
    el.innerHTML = partnerInnerHTML(PARTNERS[partnerIndex]);
    return el;
  }

  function initRender() {
    stage.innerHTML = '';
    slots.prev = makeSlotEl(wrap(currentIndex - 1), 'role-prev');
    slots.current = makeSlotEl(currentIndex, 'role-current');
    slots.next = makeSlotEl(wrap(currentIndex + 1), 'role-next');

    stage.appendChild(slots.prev);
    stage.appendChild(slots.current);
    stage.appendChild(slots.next);

    bindNav(slots.prev, goPrev);
    bindNav(slots.next, goNext);
  }

  function goNext() {
    if (isAnimating || PARTNERS.length <= 1) return;
    isAnimating = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    var exiting = slots.prev;
    var movingToPrev = slots.current;
    var movingToCurrent = slots.next;

    exiting.classList.remove('role-prev');
    exiting.classList.add('role-exit-left');

    movingToPrev.classList.remove('role-current');
    movingToPrev.classList.add('role-prev');

    movingToCurrent.classList.remove('role-next');
    movingToCurrent.classList.add('role-current');

    var newNextIndex = wrap(currentIndex + 2);
    var newNextEl = makeSlotEl(newNextIndex, 'role-next');
    newNextEl.style.opacity = '0';
    stage.appendChild(newNextEl);
    bindNav(newNextEl, goNext);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        newNextEl.style.opacity = '';
      });
    });

    currentIndex = wrap(currentIndex + 1);

    window.setTimeout(function () {
      exiting.remove();
      slots.prev = movingToPrev;
      slots.current = movingToCurrent;
      slots.next = newNextEl;
      isAnimating = false;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    }, TRANSITION_MS);
  }

  function goPrev() {
    if (isAnimating || PARTNERS.length <= 1) return;
    isAnimating = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    var exiting = slots.next;
    var movingToNext = slots.current;
    var movingToCurrent = slots.prev;

    exiting.classList.remove('role-next');
    exiting.classList.add('role-exit-right');

    movingToNext.classList.remove('role-current');
    movingToNext.classList.add('role-next');

    movingToCurrent.classList.remove('role-prev');
    movingToCurrent.classList.add('role-current');

    var newPrevIndex = wrap(currentIndex - 2);
    var newPrevEl = makeSlotEl(newPrevIndex, 'role-prev');
    newPrevEl.style.opacity = '0';
    stage.appendChild(newPrevEl);
    bindNav(newPrevEl, goPrev);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        newPrevEl.style.opacity = '';
      });
    });

    currentIndex = wrap(currentIndex - 1);

    window.setTimeout(function () {
      exiting.remove();
      slots.next = movingToNext;
      slots.current = movingToCurrent;
      slots.prev = newPrevEl;
      isAnimating = false;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    }, TRANSITION_MS);
  }

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);

  if (PARTNERS.length <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
  }

  initRender();
})();
