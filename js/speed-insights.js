/* =========================================================
   Vercel Speed Insights initialization for Dịch 2000s
   ========================================================= */

// Import the injectSpeedInsights function from the package
import { injectSpeedInsights } from '../node_modules/@vercel/speed-insights/dist/index.mjs';

// Initialize Speed Insights
// This will automatically inject the Speed Insights script into the page
// and start tracking Core Web Vitals
injectSpeedInsights({
  debug: false, // Set to true to enable debug logging
  framework: 'vanilla' // Specify this is a vanilla HTML/JS project
});
