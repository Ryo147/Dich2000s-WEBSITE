/* =========================================================
   Vercel Speed Insights initialization for Dịch 2000s
   ========================================================= */

import { injectSpeedInsights } from '../node_modules/@vercel/speed-insights/dist/index.mjs';

// Initialize Speed Insights
injectSpeedInsights({
  debug: false
});
