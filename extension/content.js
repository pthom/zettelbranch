// Zettelbranch: the entry point, loaded last. It only puts the small "Zettelbranch" button
// on the page (every claude.ai page but shared conversations). Nothing else runs until you
// click it: no timers, no watching of the page.
//
// One exception, the tail of your own click on "Open new chat": when claude.ai has copied a
// chat, Zettelbranch loads the copy's page with #zettelbranch at the end of its address
// (api.js, openCreatedChat). On that page only, the panel reads the chat and opens by itself
// if the branch is still to be started, to offer "Start the branch".
(function () {
  'use strict';
  if (location.pathname.startsWith('/share/')) return;
  globalThis.ZBUi.mount();
  if (location.hash === '#zettelbranch') globalThis.ZBUi.autoOpen();
})();
