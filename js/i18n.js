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
      'busy': 'Đang xử lý, vui lòng chờ…', 'cookie.policy': 'Xem chính sách bảo mật', 'cookie.aria': 'Thông báo cookie',
      'toast.copied': 'Đã sao chép!', 'toast.copyfail': 'Không thể sao chép, vui lòng copy thủ công.',
      'lb.close': 'Đóng', 'lb.prev': 'Ảnh trước', 'lb.next': 'Ảnh sau', 'lb.alt': 'Xem ảnh phóng to',
      'dl.win': 'Tải về cho Windows', 'dl.linux': 'Tải về cho Linux', 'dl.noold': 'Chưa có bản cũ nào.', 'dl.pre': 'bản thử nghiệm', 'dl.notes': 'Ghi chú',
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
      'acc.label': 'Tài khoản', 'acc.title': 'Cài đặt tài khoản', 'acc.close': 'Đóng', 'acc.loggedout': 'Bạn chưa đăng nhập. Nhập tên và mã 3 từ để xem tài khoản. Nếu chưa có tài khoản, hãy gửi một đánh giá ở trang game, tài khoản sẽ tự được tạo.',
      'acc.rename': 'Sửa tên', 'acc.rename.hint': 'Đổi tên được 1 lần mỗi 7 ngày. Các đánh giá cũ sẽ hiện theo tên mới.', 'acc.save': 'Lưu tên', 'acc.saved': 'Đã lưu tên mới.',
      'acc.myreviews': 'Đánh giá của bạn', 'acc.noreviews': 'Bạn chưa đánh giá bản Việt hóa nào.', 'acc.admin': 'Tài khoản quản trị: không đổi tên hay xóa được.',
      'acc.devices': 'Thiết bị đăng nhập', 'acc.devices.hint': 'Mỗi tài khoản đăng nhập được tối đa 2 thiết bị. Mỗi trình duyệt, cửa sổ ẩn danh hoặc lần đã xóa cookie được tính là một thiết bị. Thiết bị không dùng trong 21 ngày sẽ tự bị gỡ. Nhập mã 3 từ để xác nhận trước khi gỡ.',
      'acc.device.this': 'Thiết bị này', 'acc.device.other': 'Thiết bị khác', 'acc.device.since': 'Đăng nhập lúc {t}', 'acc.device.nosince': 'Không rõ thời điểm đăng nhập',
      'acc.device.code': 'Mã 3 từ để xác nhận', 'acc.device.needcode': 'Hãy nhập mã 3 từ để xác nhận.', 'acc.device.remove': 'Gỡ', 'acc.device.removeall': 'Gỡ toàn bộ thiết bị',
      'acc.device.removed': 'Đã gỡ thiết bị.', 'acc.device.removedall': 'Đã gỡ toàn bộ thiết bị.', 'acc.device.confirmall': 'Gỡ toàn bộ thiết bị? Mọi nơi đang đăng nhập, kể cả thiết bị này, sẽ bị đăng xuất.',
      'acc.device.resetlogin': 'Gỡ toàn bộ thiết bị rồi đăng nhập',
      'acc.forgot': 'Quên mã 3 từ? Nếu bạn còn đăng nhập ở một thiết bị khác, hãy vào trang Tài khoản trên thiết bị đó và tạo mã mới. Nếu không, hãy nhắn quản trị viên trên Discord của nhóm kèm tên tài khoản và nội dung đánh giá của bạn để được cấp lại mã.',
      'acc.forgot.link': 'Mở Discord của nhóm',
      'acc.email': 'Email (tuỳ chọn)', 'acc.email.label': 'Địa chỉ email', 'acc.email.hint': 'Không bắt buộc. Nếu thêm, email chỉ dùng để báo khi có yêu cầu đổi mã 3 từ; không gửi quảng cáo và không hiển thị công khai. Bạn có thể gỡ bất cứ lúc nào.',
      'acc.email.current': 'Email đã xác minh: {email}', 'acc.email.pending': 'Đã gửi mail xác minh tới {email}. Hãy bấm liên kết trong mail (kiểm tra cả mục Spam), liên kết có hiệu lực 1 giờ.',
      'acc.email.send': 'Gửi mail xác minh', 'acc.email.remove': 'Gỡ email', 'acc.email.remove.confirm': 'Gỡ email khỏi tài khoản?', 'acc.email.removed': 'Đã gỡ email.',
      'acc.email.sent': 'Đã gửi mail xác minh. Hãy kiểm tra hộp thư (và mục Spam).', 'acc.email.verified': 'Đã xác minh email. Cảm ơn bạn!',
      'err.bad_email': 'Email không hợp lệ.', 'err.bad_token': 'Liên kết không hợp lệ hoặc đã hết hạn. Hãy gửi lại mail xác minh (cần đăng nhập).', 'err.email_taken': 'Email này đã được gắn với một tài khoản khác.',
      'err.email_limit': 'Bạn đã yêu cầu xác minh quá nhiều lần hôm nay. Hãy thử lại vào ngày mai.', 'err.mail_off': 'Tính năng email chưa được bật.', 'err.mail_fail': 'Không gửi được email. Hãy thử lại sau.',
      'acc.rotate': 'Quên mã 3 từ?', 'acc.rotate.hint': 'Nếu bạn quên mã nhưng vẫn đang đăng nhập ở thiết bị này, hãy yêu cầu tạo mã mới. Để chống người mượn máy, mã mới chỉ được tạo sau 24 giờ chờ; trong thời gian đó mọi thiết bị đang đăng nhập đều thấy thông báo và huỷ được.',
      'acc.rotate.btn': 'Yêu cầu tạo mã 3 từ mới', 'acc.rotate.confirm': 'Yêu cầu tạo mã mới? Mã chỉ đổi sau 24 giờ chờ, mã cũ vẫn dùng được trong lúc đó.', 'acc.rotate.done': 'Đã tạo mã mới. Hãy lưu lại ngay.',
      'acc.code.title': 'Mã 3 từ mới (chỉ hiện một lần)', 'acc.code.warn': 'Hãy lưu mã này ngay. Mã dùng để đăng nhập trên thiết bị khác và không thể xem lại.',
      'acc.admin.reset': 'Cấp lại mã cho thành viên', 'acc.admin.reset.hint': 'Chỉ cấp khi đã xác minh đúng chủ tài khoản (ví dụ khớp nội dung đánh giá). Mã mới chỉ hiện một lần, hãy gửi riêng cho thành viên. Mọi thiết bị của họ sẽ bị đăng xuất.',
      'acc.admin.reset.name': 'Tên thành viên', 'acc.admin.reset.btn': 'Cấp mã mới', 'acc.admin.reset.done': 'Đã cấp mã mới cho {name}. Hãy gửi riêng cho họ.',
      'err.name_taken': 'Tên này đã có người dùng. Nếu là bạn, hãy nhập mã 3 từ ở mục đăng nhập; nếu không, hãy chọn tên khác.',
      'acc.rotate.wait': 'Yêu cầu tạo mã mới sẽ sẵn sàng lúc {time}. Quay lại trang này vào lúc đó để hoàn tất.',
      'acc.rotate.other': 'Một thiết bị khác đang yêu cầu tạo mã 3 từ mới (hoàn tất được từ {time}). Nếu không phải bạn, hãy huỷ ngay.',
      'acc.rotate.cancel': 'Huỷ yêu cầu',
      'acc.rotate.finish': 'Hoàn tất tạo mã mới',
      'acc.rotate.requested': 'Đã gửi yêu cầu. Mã mới sẽ sẵn sàng sau 24 giờ.',
      'acc.rotate.cancelled': 'Đã huỷ yêu cầu.',
      'err.rotate_wait': 'Chưa đến giờ hoàn tất. Hãy quay lại sau.',
      'err.rotate_none': 'Không có yêu cầu đang chờ hoặc đã hết hạn. Hãy yêu cầu lại.',
    },
    en: {
      'lang.switch': 'Tiếng Việt',
      'cookie.text': 'This site uses Google Analytics (analytics cookies) and a random visitor ID to count views and people online. These only run if you click Accept; if you decline, no data is sent.',
      'busy': 'Working, please wait…', 'cookie.policy': 'Read the privacy policy', 'cookie.aria': 'Cookie notice',
      'toast.copied': 'Copied!', 'toast.copyfail': 'Could not copy, please copy manually.',
      'lb.close': 'Close', 'lb.prev': 'Previous image', 'lb.next': 'Next image', 'lb.alt': 'Enlarged image',
      'dl.win': 'Download for Windows', 'dl.linux': 'Download for Linux', 'dl.noold': 'No older versions yet.', 'dl.pre': 'pre-release', 'dl.notes': 'Release notes',
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
      'acc.label': 'Account', 'acc.title': 'Account settings', 'acc.close': 'Close', 'acc.loggedout': 'You are not signed in. Enter your name and 3-word code to view your account. If you have no account yet, submit a review on a game page and one is created automatically.',
      'acc.rename': 'Change name', 'acc.rename.hint': 'You can rename once every 7 days. Your earlier reviews will show the new name.', 'acc.save': 'Save name', 'acc.saved': 'New name saved.',
      'acc.myreviews': 'Your reviews', 'acc.noreviews': 'You have not reviewed any localization yet.', 'acc.admin': 'Admin account: cannot be renamed or deleted.',
      'acc.devices': 'Signed-in devices', 'acc.devices.hint': 'Each account can be signed in on at most 2 devices. Every browser, private window or cleared-cookie session counts as one device. A device not used for 21 days is removed automatically. Enter your 3-word code to confirm before removing.',
      'acc.device.this': 'This device', 'acc.device.other': 'Another device', 'acc.device.since': 'Signed in {t}', 'acc.device.nosince': 'Sign-in time unknown',
      'acc.device.code': '3-word code to confirm', 'acc.device.needcode': 'Please enter your 3-word code to confirm.', 'acc.device.remove': 'Remove', 'acc.device.removeall': 'Remove all devices',
      'acc.device.removed': 'Device removed.', 'acc.device.removedall': 'All devices removed.', 'acc.device.confirmall': 'Remove all devices? Every place that is signed in, including this one, will be signed out.',
      'acc.device.resetlogin': 'Remove all devices, then sign in',
      'acc.forgot': 'Forgot your 3-word code? If you are still signed in on another device, open the Account page there and create a new code. Otherwise, message an admin on the team Discord with your account name and the text of your review to get a new code.',
      'acc.forgot.link': 'Open the team Discord',
      'acc.email': 'Email (optional)', 'acc.email.label': 'Email address', 'acc.email.hint': 'Optional. If you add one, it is only used to warn you when a new 3-word code is requested; no ads and never shown publicly. You can remove it at any time.',
      'acc.email.current': 'Verified email: {email}', 'acc.email.pending': 'Verification mail sent to {email}. Click the link in it (also check Spam); it is valid for 1 hour.',
      'acc.email.send': 'Send verification mail', 'acc.email.remove': 'Remove email', 'acc.email.remove.confirm': 'Remove the email from your account?', 'acc.email.removed': 'Email removed.',
      'acc.email.sent': 'Verification mail sent. Please check your inbox (and Spam).', 'acc.email.verified': 'Email verified. Thank you!',
      'err.bad_email': 'Invalid email address.', 'err.bad_token': 'The link is invalid or expired. Send the verification mail again (you need to be signed in).', 'err.email_taken': 'This email is already linked to another account.',
      'err.email_limit': 'Too many verification requests today. Please try again tomorrow.', 'err.mail_off': 'Email is not enabled.', 'err.mail_fail': 'Could not send the email. Please try again later.',
      'acc.rotate': 'Forgot your 3-word code?', 'acc.rotate.hint': 'If you forgot your code but are still signed in on this device, request a new one. To stop someone borrowing your device, the new code is only issued after a 24-hour wait; during that time every signed-in device sees a notice and can cancel.',
      'acc.rotate.btn': 'Request a new 3-word code', 'acc.rotate.confirm': 'Request a new code? It only changes after a 24-hour wait; the old code keeps working meanwhile.', 'acc.rotate.done': 'New code created. Save it now.',
      'acc.code.title': 'New 3-word code (shown only once)', 'acc.code.warn': 'Save this code now. You need it to sign in on another device and it cannot be shown again.',
      'acc.admin.reset': 'Issue a new code for a member', 'acc.admin.reset.hint': 'Only after you have verified the real owner (for example by matching their review text). The new code is shown once; send it to them privately. All their devices are signed out.',
      'acc.admin.reset.name': 'Member name', 'acc.admin.reset.btn': 'Issue new code', 'acc.admin.reset.done': 'New code issued for {name}. Send it to them privately.',
      'err.rename_cooldown': 'You renamed recently. Only one rename per 7 days.',
      'err.name_taken': 'This name is already taken. If it is yours, enter your 3-word code in the sign-in box; otherwise pick another name.',
      'err.bad_login': 'Wrong name or code.', 'err.device_limit': 'This account is already signed in on 2 devices. Sign out on one of them, or open the Account page to remove devices (enter your name and 3-word code).',
      'err.acct_limit': 'Too many accounts were created from your network today, or new sign-ups are paused for a moment. Use an existing account or try again later.',
      'err.dup_text': 'This comment is identical to another one. Please write it in your own words.',
      'err.locked': 'Too many attempts. Please try again later.', 'err.reserved_name': 'This name is reserved. Please choose another.',
      'err.bad_name': 'Invalid name (3–24 letters, digits, spaces, - _ .).', 'err.bad_text': 'Invalid comment (max 600 characters; no links, contact details or ads).',
      'err.bad_stars': 'Please choose 1 to 5 stars.', 'err.forbidden': 'Not allowed.', 'err.unauthorized': 'Please sign in first.',
      'acc.rotate.wait': 'Your new-code request will be ready at {time}. Come back to this page then to finish.',
      'acc.rotate.other': 'Another device requested a new 3-word code (can be completed from {time}). If this was not you, cancel now.',
      'acc.rotate.cancel': 'Cancel request',
      'acc.rotate.finish': 'Finish creating new code',
      'acc.rotate.requested': 'Request sent. The new code will be ready in 24 hours.',
      'acc.rotate.cancelled': 'Request cancelled.',
      'err.rotate_wait': 'Not ready yet. Please come back later.',
      'err.rotate_none': 'No pending request, or it expired. Please request again.',
    },
  };

  // Ngôn ngữ do ĐƯỜNG DẪN quyết định: /en/... là tiếng Anh, còn lại tiếng Việt (mỗi bản là một trang tĩnh riêng, có hreflang).
  var lang = /^\/en(\/|$)/.test(location.pathname) ? 'en' : 'vi';

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


  // Trạng thái "đang xử lý" cho thao tác gọi máy chủ: khóa nút/ô nhập trong scope ngay lập tức (chống bấm liên tục)
  // và hiện dòng báo đang chờ nếu quá 200 ms. Trả về hàm done() để gỡ.
  window.d2kBusy = function (scope) {
    if (!scope) return function () {};
    if (!document.getElementById('d2k-busy-css')) {
      var st = document.createElement('style');
      st.id = 'd2k-busy-css';
      st.textContent = '.d2k-spin{display:inline-block;width:1em;height:1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:d2kspin .7s linear infinite;vertical-align:-.15em;margin-right:.5em}@keyframes d2kspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.d2k-spin{animation:none}}';
      document.head.appendChild(st);
    }
    var locked = [].filter.call(scope.querySelectorAll('button, input, textarea, select'), function (e) { return !e.disabled; });
    locked.forEach(function (e) { e.disabled = true; });
    scope.setAttribute('aria-busy', 'true');
    var note = null;
    var timer = setTimeout(function () {
      note = document.createElement('p');
      note.setAttribute('role', 'status');
      note.className = 'text-sm text-muted-foreground mb-3';
      note.innerHTML = '<span class="d2k-spin" aria-hidden="true"></span>';
      note.appendChild(document.createTextNode(t('busy')));
      scope.insertBefore(note, scope.firstChild);
    }, 200);
    return function done() {
      clearTimeout(timer);
      locked.forEach(function (e) { e.disabled = false; });
      scope.removeAttribute('aria-busy');
      if (note && note.parentNode) note.parentNode.removeChild(note);
    };
  };

  window.d2kT = t;
  window.d2kLang = function () { return lang; };
  window.d2kApplyI18n = apply;
  // Đường dẫn trang tương ứng ở ngôn ngữ kia: /faq <-> /en/faq, / <-> /en/
  function otherPath(p) {
    if (lang === 'en') return p.replace(/^\/en(?=\/|$)/, '') || '/';
    return '/en' + (p === '/' ? '/' : p);
  }
  window.d2kSetLang = function (l) {
    var want = l === 'en' ? 'en' : 'vi';
    if (want === lang) return;
    location.href = otherPath(location.pathname) + location.search + location.hash;
  };
  // Link tới trang khác của site ở đúng ngôn ngữ hiện tại, ví dụ d2kHref('privacy.html')
  window.d2kHref = function (page) { return (lang === 'en' ? '/en/' : '/') + page; };

  document.documentElement.lang = lang;
  function init() { apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
