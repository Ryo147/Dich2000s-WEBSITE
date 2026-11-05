/* =========================================================
   Giao diện 2 ngôn ngữ (VI mặc định / EN). Chỉ dịch phần GIAO DIỆN (đánh giá, banner cookie,
   nút chân trang), không dịch nội dung bài viết/tên game. Lựa chọn lưu ở localStorage (d2k_lang).
   Thêm từ: sửa DICT bên dưới. HTML tĩnh dùng data-i18n="khóa"; JS dùng window.d2kT("khóa").
   ========================================================= */
(function () {
  'use strict';

  var DICT = {
    vi: {
      'lang.switch': 'English',
      'cookie.text': 'Website dùng Google Analytics (cookie phân tích) và một mã khách ngẫu nhiên để đếm lượt xem, số người đang online. Chỉ khi bạn bấm Chấp nhận thì các công cụ này mới chạy; nếu từ chối, không có dữ liệu nào được gửi đi.',
      'cookie.policy': 'Xem chính sách bảo mật',
      'cookie.no': 'Từ chối', 'cookie.yes': 'Chấp nhận', 'cookie.settings': 'Cài đặt cookie',
      'rv.title': 'Đánh giá bản Việt hóa', 'rv.none': 'Chưa có đánh giá nào. Hãy là người đầu tiên!',
      'rv.count': '{n} đánh giá', 'rv.avg': 'Trung bình {n} / 5',
      'rv.yourname': 'Tên hiển thị của bạn', 'rv.name.hint': '3–24 ký tự. Tên sẽ hiển thị công khai.',
      'rv.stars': 'Số sao', 'rv.star': '{n} sao', 'rv.comment': 'Bình luận (không bắt buộc, tối đa 600 ký tự)',
      'rv.consent': 'Tôi đồng ý hiển thị công khai tên và bình luận của mình, và đã đọc',
      'rv.consent.link': 'chính sách bảo mật', 'rv.submit': 'Gửi đánh giá', 'rv.update': 'Cập nhật đánh giá',
      'rv.asname': 'Đang đăng nhập với tên {name}', 'rv.logout': 'Đăng xuất thiết bị này', 'rv.delete': 'Xóa tài khoản và đánh giá của tôi',
      'rv.delete.confirm': 'Xóa tài khoản và toàn bộ đánh giá của bạn? Không thể hoàn tác.',
      'rv.haveaccount': 'Đã có tài khoản? Đăng nhập bằng mã 3 từ', 'rv.code': 'Mã 3 từ của bạn', 'rv.login': 'Đăng nhập',
      'rv.newcode.title': 'Mã đăng nhập của bạn (chỉ hiện một lần)', 'rv.newcode.warn': 'Hãy lưu mã này. Mã dùng để đăng nhập trên thiết bị khác hoặc sửa đánh giá khi bạn đăng xuất. Không thể xem lại.',
      'rv.copy': 'Sao chép', 'rv.copied': 'Đã chép', 'rv.report': 'Báo cáo', 'rv.reported': 'Đã báo cáo',
      'rv.edited': '(đã sửa)', 'rv.sent': 'Đã gửi đánh giá. Cảm ơn bạn!', 'rv.updated': 'Đã cập nhật đánh giá.',
      'rv.pickstars': 'Hãy chọn số sao.', 'rv.needname': 'Hãy nhập tên hiển thị.', 'rv.needconsent': 'Hãy tích ô đồng ý hiển thị công khai.',
      'rv.admin.remove': 'Gỡ chữ', 'rv.admin.restore': 'Khôi phục',
      'rv.neterr': 'Không kết nối được máy chủ. Hãy thử lại sau.',
      'rv.featured.title': 'Người chơi nói gì', 'rv.featured.sub': 'Đánh giá ngẫu nhiên từ cộng đồng.',
      'rv.rules': 'Nội quy: không dùng lời lẽ xúc phạm, kỳ thị, spam hay chứa liên kết. Điểm sao luôn được giữ nguyên; chỉ phần chữ vi phạm mới bị gỡ.',
      'rv.rules.link': 'Xem nội quy đầy đủ',
      'err.name_taken': 'Tên này đã có người dùng. Nếu là bạn, hãy nhập mã 3 từ ở mục đăng nhập; nếu không, hãy chọn tên khác.',
    },
    en: {
      'lang.switch': 'Tiếng Việt',
      'cookie.text': 'This site uses Google Analytics (analytics cookies) and a random visitor ID to count views and people online. These only run if you click Accept; if you decline, no data is sent.',
      'cookie.policy': 'Read the privacy policy',
      'cookie.no': 'Decline', 'cookie.yes': 'Accept', 'cookie.settings': 'Cookie settings',
      'rv.title': 'Rate this Vietnamese localization', 'rv.none': 'No reviews yet. Be the first!',
      'rv.count': '{n} reviews', 'rv.avg': 'Average {n} / 5',
      'rv.yourname': 'Your display name', 'rv.name.hint': '3–24 characters. Your name is shown publicly.',
      'rv.stars': 'Stars', 'rv.star': '{n} star(s)', 'rv.comment': 'Comment (optional, max 600 characters)',
      'rv.consent': 'I agree to show my name and comment publicly, and I have read the',
      'rv.consent.link': 'privacy policy', 'rv.submit': 'Submit review', 'rv.update': 'Update review',
      'rv.asname': 'Signed in as {name}', 'rv.logout': 'Sign out of this device', 'rv.delete': 'Delete my account and reviews',
      'rv.delete.confirm': 'Delete your account and all your reviews? This cannot be undone.',
      'rv.haveaccount': 'Already have an account? Sign in with your 3-word code', 'rv.code': 'Your 3-word code', 'rv.login': 'Sign in',
      'rv.newcode.title': 'Your sign-in code (shown only once)', 'rv.newcode.warn': 'Save this code. You need it to sign in on another device or to edit your review after signing out. It cannot be shown again.',
      'rv.copy': 'Copy', 'rv.copied': 'Copied', 'rv.report': 'Report', 'rv.reported': 'Reported',
      'rv.edited': '(edited)', 'rv.sent': 'Review submitted. Thank you!', 'rv.updated': 'Review updated.',
      'rv.pickstars': 'Please choose a star rating.', 'rv.needname': 'Please enter a display name.', 'rv.needconsent': 'Please tick the box to agree to public display.',
      'rv.admin.remove': 'Remove text', 'rv.admin.restore': 'Restore',
      'rv.neterr': 'Could not reach the server. Please try again later.',
      'rv.featured.title': 'What players say', 'rv.featured.sub': 'Random reviews from the community.',
      'rv.rules': 'Rules: no abuse, hate, spam or links. The star rating is always kept; only violating text is removed.',
      'rv.rules.link': 'Read the full rules',
      'err.name_taken': 'This name is already taken. If it is yours, enter your 3-word code in the sign-in box; otherwise pick another name.',
      'err.bad_login': 'Wrong name or code.', 'err.device_limit': 'This account is already signed in on 2 devices. Sign out on one of them and try again.',
      'err.locked': 'Too many attempts. Please try again later.', 'err.reserved_name': 'This name is reserved. Please choose another.',
      'err.bad_name': 'Invalid name (3–24 letters, digits, spaces, - _ .).', 'err.bad_text': 'Invalid comment (max 600 characters, no links).',
      'err.bad_stars': 'Please choose 1 to 5 stars.', 'err.forbidden': 'Not allowed.', 'err.unauthorized': 'Please sign in first.',
    },
  };

  var lang = 'vi';
  try { lang = localStorage.getItem('d2k_lang') === 'en' ? 'en' : 'vi'; } catch (e) { /* bỏ qua */ }

  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.vi[key] || key;
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function apply(root) {
    var els = (root || document).querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute('data-i18n'));
    var phs = (root || document).querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phs.length; j++) phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-i18n-ph')));
  }

  window.d2kT = t;
  window.d2kLang = function () { return lang; };
  window.d2kApplyI18n = apply;
  window.d2kSetLang = function (l) {
    lang = l === 'en' ? 'en' : 'vi';
    try { localStorage.setItem('d2k_lang', lang); } catch (e) { /* bỏ qua */ }
    document.documentElement.lang = lang;
    apply();
    window.dispatchEvent(new CustomEvent('d2k-lang', { detail: lang }));
  };

  document.documentElement.lang = lang;
  function init() { apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
