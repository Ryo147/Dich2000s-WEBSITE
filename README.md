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

## Lệnh
- `npm test`: test lõi đánh giá và kiểm tra `?v=` của js/css.
- `npm run build:css`: build `css/tailwind.css` (Vercel không tự build; **phải commit file này** khi thêm class Tailwind mới, kể cả class viết trong `js/*.js`).
- `npm run bump`: cập nhật `?v=` trong HTML theo nội dung js/css. `/js` và `/css` được cache `immutable`, nên sửa file mà không bump thì người đã vào site vẫn nhận bản cũ. `npm test` sẽ đỏ nếu quên.
- `npm run optimize:images`: nén ảnh sang WebP.

Quy trình sau khi sửa js/css: `npm run build:css && npm run bump && npm test`.

## Thêm một game mới vào hệ thống đánh giá
Slug phải khớp ở 3 nơi: `GAMES` trong `lib/ratings-core.js`, `GAMES` trong `js/reviews.js` và `js/account.js`; trang game cần `data-project-page="<slug>"`.

## Tài khoản quản trị
Tạo bằng script riêng chạy trên máy chủ sở hữu (không để trong repo; `*.local.mjs` và `admin-codes*.txt` đã bị `.gitignore`). Không dán mã hay khóa vào chat, issue hay commit.

## Lưu ý
- `api/ratings.js` chỉ nhận POST từ `https://dich2000s.vercel.app` (chống CSRF). Đổi tên miền hoặc test trên bản preview thì sửa `ALLOWED_ORIGINS`.
