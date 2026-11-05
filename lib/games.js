// NGUỒN DUY NHẤT danh sách game có đánh giá. Thêm game: sửa ở đây rồi chạy `npm run build:games && npm run bump`.
// (js/games.js cho trình duyệt được sinh từ file này; tests/games.test.mjs báo đỏ nếu lệch.)
export const GAME_LIST = [
  { slug: 'plague-inc', name: 'Plague Inc: Evolved', url: 'projects/plague-inc.html' },
  { slug: 're2-remake', name: 'Resident Evil 2 Remake', url: 'projects/re2-remake.html' },
  { slug: 'dmc5', name: 'Devil May Cry 5', url: 'projects/dmc5.html' },
  { slug: 'dreamcore_1', name: 'Dreamcore?', url: 'projects/dreamcore_1.html' },
];
export const GAME_SLUGS = GAME_LIST.map((g) => g.slug);
