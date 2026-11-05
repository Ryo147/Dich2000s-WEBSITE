# Dich2000s-WEBSITE
Đây là nơi lưu trữ mã nguồn trang web của Dịch Những Năm 2000.

Develop by Claude, GLM / Editing by Nhựa Inox (Ryo147)

## Cấu trúc
- Trang tĩnh (HTML + JS thuần + Tailwind đã build sẵn), deploy trên Vercel. `api/*.js` là hàm serverless dùng Upstash Redis.
- `api/ratings.js` + `lib/ratings-core.js`: đánh giá, tài khoản (tên + mã 3 từ), quản trị. `js/reviews.js`, `js/account.js`: giao diện.
- `js/i18n.js`: giao diện VI/EN (chỉ phần giao diện, không dịch nội dung bài).

## Biến môi trường (đặt trên Vercel, KHÔNG commit)
| Biến | Dùng cho |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (thư viện tự nhận; `UPSTASH_REDIS_REST_*` cũng được) |
| `AUTH_SECRET` | băm mã đăng nhập và IP. Đổi giá trị = mọi mã đăng nhập cũ mất hiệu lực |
| `STATS_SALT` | băm IP cho thống kê lượt xem |
| `MAIL_USER`, `MAIL_PASS` | (tuỳ chọn) Gmail riêng của nhóm + Mật khẩu ứng dụng để gửi email xác minh/cảnh báo. Thiếu thì tính năng email tự tắt |

## Lệnh
- `npm test`: test lõi đánh giá và kiểm tra `?v=` của js/css.
- `npm run build:css`: build `css/tailwind.css` (Vercel không tự build; **phải commit file này** khi thêm class Tailwind mới, kể cả class viết trong `js/*.js`).
- `npm run build:games`: sinh `js/games.js` (cho trình duyệt) từ `lib/games.js`.
- `npm run bump`: cập nhật `?v=` trong HTML theo nội dung js/css. `/js` và `/css` được cache `immutable`, nên sửa file mà không bump thì người đã vào site vẫn nhận bản cũ. `npm test` sẽ đỏ nếu quên.
- `npm run optimize:images`: nén ảnh sang WebP.

Quy trình sau khi sửa js/css: `npm run build:css && npm run bump && npm test`.

## Thêm một game mới vào hệ thống đánh giá
1. Thêm một dòng vào `lib/games.js` (nguồn duy nhất: slug, tên, đường dẫn trang).
2. Tạo trang game với `<main data-project-page="<slug>">`.
3. `npm run build:games && npm run bump && npm test` (test báo đỏ nếu lệch hoặc thiếu).

## Tài khoản quản trị
Tạo bằng script riêng chạy trên máy chủ sở hữu (không để trong repo; `*.local.mjs` và `admin-codes*.txt` đã bị `.gitignore`). Không dán mã hay khóa vào chat, issue hay commit.

## Lưu ý
- `api/ratings.js` chỉ nhận POST từ `https://dich2000s.vercel.app` (chống CSRF). Đổi tên miền hoặc test trên bản preview thì sửa `ALLOWED_ORIGINS`.
