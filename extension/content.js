// Zettelbranch: the entry point, loaded last. It only puts the small "Zettelbranch" button
// on the page (every claude.ai page but shared conversations). Nothing else runs until you
// click it: no timers, no watching of the page.
(function () {
  'use strict';
  if (!location.pathname.startsWith('/share/')) globalThis.ZBUi.mount();
})();
