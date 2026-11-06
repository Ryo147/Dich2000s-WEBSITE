/* =========================================================
   DỊCH 2000s — FAQ script (static build, English)
   FAQ data + search + category filter + accordion.
   Data is taken verbatim from the original main website.
   ========================================================= */
(function () {
  'use strict';

  var CATS = { install: 'Installation errors', game: 'In-game errors', viethoa: 'Localization errors', general: 'General questions', account: 'Reviews & accounts' };

  var FAQS = [
    { cat: 'install', q: 'Antivirus / Windows Defender blocks the installer. What should I do?',
      a: 'This is normal because the installer is not digitally signed yet. Add an exception for the install folder or the .exe file in your antivirus software, then run it again.' },
    { cat: 'install', q: 'The installer reports a hash verification error / file check failed',
      a: 'This is usually caused by a download that broke midway (unstable network) or by your antivirus silently modifying the file before the installer checks it. Delete the downloaded file, <b>temporarily</b> turn off real-time protection, then download it again from scratch.' },
    { cat: 'install', q: 'Installation finished but the installer cannot detect the game folder',
      a: 'Check that the path points to the game\'s root folder, the one containing its .exe file. If you installed through Steam, the path usually looks like .../steamapps/common/game name.' },
    { cat: 'install', q: 'The installer keeps failing partway through downloading the update',
      a: 'It may be an unstable connection or a slow CDN (Content Delivery Network). If it still fails after several attempts, try switching networks or using a VPN, then try again.' },
    { cat: 'game', q: 'After patching, the game reports missing files or will not start',
      a: 'This is usually because Steam automatically updated the game to a new version. Check whether your current game version matches the version the patch supports. If it does not, uninstall the patch and wait for the team to release a new compatible patch.' },
    { cat: 'game', q: 'Vietnamese text overflows, covers the UI or gets cut off',
      a: 'Some dialogue boxes in the original game were designed for English (which is shorter than Vietnamese with diacritics), so long sentences sometimes overflow. This is a known issue with a few lines of dialogue. The team will adjust the length of the translated lines in later updates.' },
    { cat: 'game', q: 'I launch the game but still see English, not Vietnamese',
      a: 'Check the game\'s own Language settings and make sure it is switched to the option the patch applies to. If that does not work, try patching again from scratch through the installer.' },
    { cat: 'game', q: 'After patching, text or UI shows blotchy pink-purple (magenta) colors',
      a: 'This is the color most game engines show when a resource (font, material, shader) is missing or loaded incorrectly. If you play a legitimate copy, the cause is usually that the patch was missing files during installation (the network dropped midway, or antivirus blocked part of it). Try uninstalling the patch and reinstalling it in full from the installer. If it turns out to be a bug in the team\'s patch, you can report it through our fanpage or Discord.<br><br>If you play a cracked copy, it is very likely that the crack compressed or stripped some of the original resources to reduce its size, so the file structure no longer fully matches the patch, which was built on the original version. In this case the team cannot guarantee the patch will work correctly, since we have no control over how each crack repackages the files.<br><br><b>To comply with current laws, the translation team does not provide any solution or link related to cracked games.</b>' },
    { cat: 'viethoa', q: 'How do I update the Vietnamese patch to a new version?',
      a: 'Follow these steps:<br>1. Remove the current Vietnamese patch.<br>2. Restore the game files from Steam (Verify files) to re-download the whole game.<br>3. Right-click the app in the nav bar and choose to check for Vietnamese patch updates.<br>4. When you are notified that a new Vietnamese patch is available, download it and enjoy.' },
    { cat: 'viethoa', q: 'How do I report a translation error or a technical error in the patch?',
      a: 'Join the team\'s Discord and report the error in the <b>#\u{1F41E}║báo-lỗi</b> channel. The team will receive and handle it.<br><br>For installer errors, you can report them to the team <a href=\'https://github.com/Ryo147/PatchVietHoaInstaller/issues/new\'><b><u>here</u></b></a>.' },
    { cat: 'viethoa', q: 'How do I report a typo or a mistranslated line?',
      a: 'Report it through Discord (the <b>#\u{1F41E}║báo-lỗi</b> channel) or message the team\'s Facebook fanpage. To help the team find and fix it quickly, please include:<br>- The game name and the patch version you are using.<br>- A screenshot of the problem (with the dialogue line or location in the game clearly visible).<br>- The correct line you suggest, if any.' },
    { cat: 'viethoa', q: 'I think a translated term is inappropriate or inconsistent. How do I give feedback?',
      a: 'Report it through Discord or the fanpage, the same way as reporting a typo, and also include: the original term in the game, how it is currently translated, where the term appears (a screenshot is best) and the translation you suggest along with your reasons. The team will review it and make it consistent if it makes sense.' },
    { cat: 'general', q: 'Is the translation free?',
      a: 'Yes. Every Dịch 2000s patch is <b>free and will always be free</b>, with no fees of any kind. If you see anyone selling our patches, that is not the team\'s doing.' },
    { cat: 'general', q: 'How can I see how far along a project is?',
      a: 'Check the <b>/projects</b> page on the website. Each project lists its status and translator information. The team also posts regular updates on Discord.' },
    { cat: 'general', q: 'What if I want to suggest a game for Vietnamese localization?',
      a: 'Join the team\'s Discord and head to the <b>#\u{1F4AD}╚đề-xuất-việt-hóa</b> channel. The team will review and consider the games you suggest.' },
    { cat: 'account', q: "How do I rate a Vietnamese patch?",
      a: "Open the game's page, scroll to the bottom, choose a star rating, enter a display name, tick the box agreeing to public display, then click Submit. A comment is optional. Your first review automatically creates an account under the name you chose and issues a 3-word code for signing in again. The code is shown only once, so save it right away." },
    { cat: 'account', q: "What if I forget my 3-word code?",
      a: "If you are still signed in on a device, go to Account in the menu and click Request a new 3-word code. To protect against someone borrowing your device, the new code can only be created after a 24-hour wait. During that time the old code still works, and every signed-in device sees a notice so you can cancel the request if it was not you. When it completes, the old code is invalidated and other devices are signed out. If you have added and verified an email on the Account page, you will get an email when a code change is requested. If you have lost every sign-in, message an admin on the team's Discord or Facebook to have a code reissued after verifying that you own the account." },
    { cat: 'account', q: "Do I need to provide an email?",
      a: "No. Creating an account through a review does not require an email. You can add an email yourself (optional) on the Account page to get notified when a 3-word code change is requested. The email must be verified through a link sent to your inbox, is never shown publicly and can be removed at any time." },
    { cat: 'account', q: "Why can't I sign in, and it says 2 devices are already in use?",
      a: "Each account can be signed in on at most 2 devices. Each browser, incognito window or cleared-cookies session counts as one device. Go to Account and enter your name and 3-word code to view and remove devices. A device unused for 21 days is removed automatically." },
    { cat: 'account', q: "My comment was removed. Do I lose my star rating?",
      a: "No. Only the text that violates the rules is removed and replaced with the line Removed for violating the rules; your stars are still counted. The team does not remove reviews just because of a low score. See the Review rules page for details." },
    { cat: 'account', q: "How do I change my name or delete my account and reviews?",
      a: "Go to Account in the menu: you can change your name (once every 7 days), review your past reviews, and delete your account along with all your reviews. Deletion cannot be undone." },
  ];

  var state = { cat: 'all', q: '' };

  function buildFaqHtml() {
    var q = state.q.trim().toLowerCase();
    var filtered = FAQS.filter(function (item) {
      var catOk = state.cat === 'all' || item.cat === state.cat;
      var textOk = !q || (item.q + ' ' + item.a).toLowerCase().indexOf(q) !== -1;
      return catOk && textOk;
    });
    if (filtered.length === 0) return null;

    var groups = {};
    filtered.forEach(function (item) {
      (groups[item.cat] = groups[item.cat] || []).push(item);
    });

    var order = state.cat === 'all' ? ['install', 'game', 'viethoa', 'general'] : [state.cat];
    var html = '';
    order.forEach(function (catKey) {
      if (!groups[catKey]) return;
      html += '<div class="section-label mb-4 mt-8">// ' + CATS[catKey] + '</div>';
      groups[catKey].forEach(function (item, idx) {
        var id = catKey + '-' + idx;
        html +=
          '<div class="faq-item" data-id="' + id + '">' +
          '<div class="faq-q" onclick="toggleFaq(\'' + id + '\')">' +
          '<span>' + item.q + '</span>' +
          '<span class="chev">\u25BE</span>' +
          '</div>' +
          '<div class="faq-a" id="a-' + id + '">' +
          '<div class="faq-a-inner">' + item.a + '</div>' +
          '</div>' +
          '</div>';
      });
    });
    return html;
  }

  function renderFaq() {
    var results = document.getElementById('faqResults');
    var empty = document.getElementById('faqEmpty');
    var html = buildFaqHtml();
    results.classList.add('fading');
    setTimeout(function () {
      if (html === null) {
        results.innerHTML = '';
        empty.style.display = 'block';
      } else {
        empty.style.display = 'none';
        results.innerHTML = html;
      }
      results.classList.remove('fading');
    }, 120);
  }

  window.toggleFaq = function (id) {
    var item = document.querySelector('.faq-item[data-id="' + id + '"]');
    var body = document.getElementById('a-' + id);
    if (!item || !body) return;
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function (el) {
      el.classList.remove('open');
      el.querySelector('.faq-a').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 40 + 'px';
    }
  };

  var searchDebounce;
  document.getElementById('faqChips').addEventListener('click', function (e) {
    var btn = e.target.closest('.chip-filter');
    if (!btn) return;
    document.querySelectorAll('.chip-filter').forEach(function (c) { c.classList.remove('active'); });
    btn.classList.add('active');
    state.cat = btn.dataset.cat;
    renderFaq();
  });

  document.getElementById('faqSearch').addEventListener('input', function (e) {
    clearTimeout(searchDebounce);
    var val = e.target.value;
    searchDebounce = setTimeout(function () {
      state.q = val;
      renderFaq();
    }, 150);
  });

  document.getElementById('faqResults').innerHTML = buildFaqHtml() || '';
  document.getElementById('faqEmpty').style.display = buildFaqHtml() ? 'none' : 'block';
})();
