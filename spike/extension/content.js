// Zettelbranch P0 spike: content script (isolated world).
//
// 1. Waits until the messages have rendered and their count is stable, then extracts
//    them with ZBExtract (extract.js) and writes the result as JSON to
//    <html data-zb-p0-result>, or an error to <html data-zb-p0-error>.
// 2. Probe trigger, the mechanism later probes reuse: when the harness sets
//    <html data-zb-probe="<name>:<nonce>">, the probe runs and its result goes to
//    <html data-zb-probe-result> as {name, nonce, ok, result|error}.
// No network, no storage, nothing injected into the page. It never reads, stores or sends
// credentials or session tokens (no cookies, no web storage).
(function () {
  'use strict';

  const root = document.documentElement;
  const T0 = performance.now(); // ms since navigation start
  const TIMEOUT_MS = 30000;
  const STABLE_MS = 1500;
  const POLL_MS = 250;

  const PROBES = {
    extract: () => ZBExtract.extract(document),
    count: () => ({ messageCount: ZBExtract.countMessages(document) }),
  };

  root.setAttribute('data-zb-p0-state', 'waiting');

  let lastCount = -1;
  let stableSince = T0;
  let firstSeen = null;
  const timer = setInterval(tick, POLL_MS);
  tick();

  function tick() {
    const now = performance.now();
    let n;
    try {
      n = ZBExtract.countMessages(document);
    } catch (e) {
      return fail(e);
    }
    if (n > 0 && firstSeen === null) firstSeen = now;
    const streaming = !!document.querySelector(ZBExtract.SELECTORS.streaming);
    if (n !== lastCount || streaming) {
      lastCount = n;
      stableSince = now;
    }
    if (n > 0 && !streaming && now - stableSince >= STABLE_MS) return finish(now);
    if (now - T0 > TIMEOUT_MS) fail(new Error(`no stable messages after ${TIMEOUT_MS} ms (last count ${n})`));
  }

  function finish(now) {
    clearInterval(timer);
    try {
      const result = ZBExtract.extract(document);
      result.timing = {
        scriptStartMs: Math.round(T0),
        firstMessageMs: firstSeen === null ? null : Math.round(firstSeen),
        stableMs: Math.round(now),
        extractMs: Math.round(performance.now() - now),
      };
      root.setAttribute('data-zb-p0-result', JSON.stringify(result));
      root.setAttribute('data-zb-p0-state', 'done');
    } catch (e) {
      fail(e);
    }
  }

  function fail(e) {
    clearInterval(timer);
    const err = { message: String((e && e.message) || e), stack: e && e.stack ? String(e.stack) : null };
    try {
      err.diag = ZBExtract.diagnose(document);
    } catch (e2) {
      err.diagError = String(e2);
    }
    root.setAttribute('data-zb-p0-error', JSON.stringify(err));
    root.setAttribute('data-zb-p0-state', 'error');
  }

  new MutationObserver(() => {
    const v = root.getAttribute('data-zb-probe');
    if (!v) return;
    root.removeAttribute('data-zb-probe');
    const [name, nonce] = v.split(':');
    const out = { name, nonce };
    try {
      if (!PROBES[name]) throw new Error('unknown probe: ' + name);
      out.result = PROBES[name]();
      out.ok = true;
    } catch (e) {
      out.ok = false;
      out.error = String((e && e.message) || e);
    }
    root.setAttribute('data-zb-probe-result', JSON.stringify(out));
  }).observe(root, { attributes: true, attributeFilter: ['data-zb-probe'] });
})();
