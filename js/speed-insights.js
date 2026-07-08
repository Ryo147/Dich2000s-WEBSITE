/* =========================================================
   Vercel Speed Insights initialization for Dịch 2000s
   ========================================================= */

// Initialize Speed Insights queue for vanilla JS
// This follows the Vercel Speed Insights vanilla JS implementation
(function() {
  window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
  };
})();

// Load the Speed Insights script
// When deployed on Vercel, this will use the optimized Vercel-provided script
// For development/local testing, it will fall back to the Vercel CDN
(function() {
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  
  // Add error handling to fallback to development script if needed
  script.onerror = function() {
    // If /_vercel/speed-insights/script.js is not available (e.g., local development),
    // fall back to the debug version from Vercel CDN
    const fallbackScript = document.createElement('script');
    fallbackScript.defer = true;
    fallbackScript.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
    fallbackScript.setAttribute('data-sdkn', '@vercel/speed-insights/vanilla');
    fallbackScript.setAttribute('data-sdkv', '1.3.1');
    document.head.appendChild(fallbackScript);
  };
  
  script.setAttribute('data-sdkn', '@vercel/speed-insights/vanilla');
  script.setAttribute('data-sdkv', '1.3.1');
  document.head.appendChild(script);
})();
