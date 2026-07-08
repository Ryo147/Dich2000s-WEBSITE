/* =========================================================
   Vercel Speed Insights initialization for Dịch 2000s
   ========================================================= */

// Import the injectSpeedInsights function from the package
import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
// This will automatically inject the Speed Insights script into the page
// and start tracking Core Web Vitals
injectSpeedInsights({
  debug: false, // Set to true to enable debug logging
});
