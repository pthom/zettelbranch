// Zettelbranch: the entry point, loaded last. It puts the small "Zettelbranch" button on the
// page (every claude.ai page but shared conversations). Nothing else runs until you click it,
// with one exception: a page you opened from a link of the panel's tree (its address ends
// with #zettelbranch, a marker that never leaves the browser) opens the panel at once, so
// you see where you are in the tree.
(function () {
  'use strict';
  const Z = globalThis.ZBUi;
  if (location.pathname.startsWith('/share/')) return;
  Z.mount();
  if (location.hash === Z.FROM_TREE) Z.open();
})();
