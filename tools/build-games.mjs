// Sinh js/games.js (cho trình duyệt) từ lib/games.js. Chạy: npm run build:games
import { writeFileSync } from 'node:fs';
import { GAME_LIST } from '../lib/games.js';

export const render = () => {
  const map = Object.fromEntries(GAME_LIST.map(({ slug, name, url }) => [slug, { name, url }]));
  return `// SINH TỰ ĐỘNG từ lib/games.js bằng \`npm run build:games\`. Không sửa tay.\nwindow.D2K_GAMES = ${JSON.stringify(map, null, 2)};\n`;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(new URL('../js/games.js', import.meta.url), render());
  console.log('Đã sinh js/games.js');
}
