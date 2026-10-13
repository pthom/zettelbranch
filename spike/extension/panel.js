// Zettelbranch spike: the probe panel. A small floating panel at the bottom right, in a
// Shadow DOM, built with DOM nodes and textContent only. Click listeners only: no keyboard
// or input listeners; field values are read when a button is clicked. Results are kept in
// memory and copied to the clipboard only when Pascal clicks "Copy results".
(function (global) {
  'use strict';

  const VERSION = '0.0.8';
  const Z = () => global.ZBProbes;
  const log = [];
  let host = null;
  let statusEl = null;

  const CSS = `
    :host { all: initial; }
    .wrap { font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--fg);
      --fg: #1f1e1b; --muted: #6b675e; --bg: #fffdf8; --line: #d8d2c2; --btn: #f1ece0; --btn-hover: #e6dfcd; --accent: #8a4b2a; --code: #f6f3ea; }
    @media (prefers-color-scheme: dark) {
      .wrap { --fg: #ece8de; --muted: #a39e92; --bg: #23211d; --line: #45413a; --btn: #34312b; --btn-hover: #403c35; --accent: #e0a07a; --code: #1b1a17; }
    }
    .pill { background: var(--accent); color: #fff; border: 0; border-radius: 999px; padding: 6px 12px; font: inherit; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.2); }
    .panel { width: 410px; max-width: calc(100vw - 24px); max-height: 78vh; overflow: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 28px rgba(0,0,0,.22); }
    .head { position: sticky; top: 0; background: var(--bg); border-bottom: 1px solid var(--line); padding: 8px 10px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; z-index: 1; }
    .head b { flex: 1; font-size: 13px; }
    .status { width: 100%; color: var(--muted); }
    section { padding: 8px 10px 10px; border-bottom: 1px solid var(--line); }
    h3 { margin: 0 0 4px; font-size: 12.5px; }
    p { margin: 0 0 6px; color: var(--muted); }
    .row { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; align-items: center; }
    button { font: inherit; background: var(--btn); color: var(--fg); border: 1px solid var(--line); border-radius: 6px; padding: 3px 8px; cursor: pointer; }
    button:hover { background: var(--btn-hover); }
    label { display: inline-flex; gap: 4px; align-items: center; margin-right: 8px; }
    pre { margin: 6px 0 0; padding: 6px; background: var(--code); border: 1px solid var(--line); border-radius: 6px; max-height: 220px; overflow: auto; white-space: pre-wrap; word-break: break-word; font: 11px/1.4 ui-monospace, Menlo, monospace; }
    pre:empty { display: none; }
    .preview { max-height: 260px; }
    .link { display: inline-block; margin: 6px 0 0; color: var(--accent); font-weight: 600; }
    .link[hidden] { display: none; }
    ol.steps { margin: 4px 0 0; padding-left: 18px; }
    ol.steps li { margin: 0 0 8px; }
    ol.steps li::marker { color: var(--accent); font-weight: 600; }
    ol.steps p { color: var(--fg); }
    .fork { font-weight: 600; }
  `;

  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') e.textContent = v;
      else if (k === 'class') e.className = v;
      else e.setAttribute(k, v);
    }
    for (const c of children) e.append(c);
    return e;
  }

  function show(pre, result) {
    const shown = result && typeof result === 'object' && 'preview' in result ? { ...result, preview: '(shown below)' } : result;
    const text = JSON.stringify(shown, null, 2);
    pre.textContent = text.length > 6000 ? text.slice(0, 6000) + '\n… (cut here; "Copy results" has everything)' : text;
  }

  async function run(probe, action, fn, out) {
    out.textContent = 'running…';
    const t0 = performance.now();
    let result;
    try {
      result = await fn();
    } catch (e) {
      result = { ok: false, ...global.ZBApi.errorInfo(e) };
    }
    log.push({ probe, action, at: new Date().toISOString(), ms: Math.round(performance.now() - t0), page: Z().pageKind().kind, result });
    show(out, result);
    status(`${log.length} result${log.length === 1 ? '' : 's'} in memory. A reload empties them: copy them first.`);
    return result;
  }

  function status(text) {
    if (statusEl) statusEl.textContent = text;
  }

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      status(`Copied ${what}. Paste it to Claude.`);
      return true;
    } catch (e) {
      status(`Copy failed (${e && e.message ? e.message : e}). The text is in the box below; select it by hand.`);
      return false;
    }
  }

  function probeButton(id, [label, fn, before], out, extra) {
    const b = el('button', { type: 'button', 'data-zb': `${id}-${label}`, text: label });
    b.addEventListener('click', async () => {
      if (before) before(out);
      const r = await run(id.toUpperCase(), label, fn, out);
      if (r && typeof r.newChatPath === 'string' && extra.linkEl) {
        extra.linkEl.setAttribute('href', r.newChatPath);
        extra.linkEl.hidden = false;
      }
      if (r && typeof r.preview === 'string' && extra.previewEl) {
        extra.previewEl.textContent = r.preview;
        extra.sizeEl.textContent = `${r.chars} characters, about ${r.tokensEstimate} tokens, ${r.turns} turns${r.flattened ? ', flattened' : ''}`;
      }
    });
    return b;
  }

  // One section per probe: plain instructions, buttons, a result area.
  function section(id, title, lines, buttons, extra = {}) {
    const out = el('pre', { 'data-zb-result': id });
    const row = el('div', { class: 'row' }, buttons.map((b) => probeButton(id, b, out, extra)));
    return el('section', { 'data-zb-section': id }, [el('h3', { text: title }), ...lines.map((l) => el('p', { text: l })), row, out, ...(extra.after || [])]);
  }

  // A probe done in order: numbered steps, each with its text, controls and buttons.
  function stepsSection(id, title, intro, steps, extra = {}) {
    const out = el('pre', { 'data-zb-result': id });
    const items = steps.map((st) => {
      const kids = [el('p', { text: st.text }), ...(st.controls || [])];
      if (st.buttons) kids.push(el('div', { class: 'row' }, st.buttons.map((b) => probeButton(id, b, out, extra))));
      return el('li', {}, kids);
    });
    return el('section', { 'data-zb-section': id }, [el('h3', { text: title }), ...intro.map((l) => el('p', { text: l })), el('ol', { class: 'steps' }, items), out, ...(extra.after || [])]);
  }

  function build() {
    const p = Z();
    const pre = el('pre', { 'data-zb-copybox': '' });
    statusEl = el('div', { class: 'status', text: 'Results stay in this tab only.' });
    const body = el('div');
    const panel = el('div', { class: 'panel', hidden: '' });
    const pill = el('button', { class: 'pill', type: 'button', 'data-zb': 'open', text: 'ZB probes' });
    const hide = el('button', { type: 'button', 'data-zb': 'hide', text: 'Hide' });
    const copyBtn = el('button', { type: 'button', 'data-zb': 'copy-results', text: 'Copy results' });
    const clearBtn = el('button', { type: 'button', 'data-zb': 'clear', text: 'Clear' });
    pill.addEventListener('click', () => {
      panel.hidden = false;
      pill.hidden = true;
    });
    hide.addEventListener('click', () => {
      panel.hidden = true;
      pill.hidden = false;
    });
    copyBtn.addEventListener('click', async () => {
      const text = JSON.stringify({ spike: 'Zettelbranch Milestone 0 probes', version: VERSION, copiedAt: new Date().toISOString(), results: log }, null, 2);
      if (!(await copy(text, `${log.length} results`))) pre.textContent = text;
    });
    clearBtn.addEventListener('click', () => {
      log.length = 0;
      pre.textContent = '';
      status('Results cleared.');
    });
    const head = el('div', { class: 'head' }, [el('b', { text: `Zettelbranch spike ${VERSION}` }), copyBtn, clearBtn, hide, statusEl]);

    // P8 controls, read on click.
    const forkLabel = el('span', { class: 'fork', 'data-zb': 'p8-fork' });
    const showFork = () => {
      const v = p.getForkAt();
      const last = mode() === 'own' ? 'your last message' : "Claude's last reply";
      forkLabel.textContent = v ? `Branch point: message ${v} of the chat` : `Branch point: ${last}`;
    };
    const step = (d) => () => {
      const base = p.getForkAt() || global.ZBExtract.countMessages(document) || 1;
      p.setForkAt(Math.max(1, base + d));
      showFork();
    };
    const minus = el('button', { type: 'button', 'data-zb': 'p8-minus', text: '−' });
    const plus = el('button', { type: 'button', 'data-zb': 'p8-plus', text: '+' });
    const auto = el('button', { type: 'button', 'data-zb': 'p8-auto', text: 'Last' });
    minus.addEventListener('click', step(-1));
    plus.addEventListener('click', step(+1));
    auto.addEventListener('click', () => {
      p.setForkAt(null);
      showFork();
    });
    const reply = el('input', { type: 'radio', name: 'zb-mode', value: 'reply', checked: '' });
    const own = el('input', { type: 'radio', name: 'zb-mode', value: 'own' });
    const mode = () => (own.checked ? 'own' : 'reply');
    reply.addEventListener('click', showFork);
    own.addEventListener('click', showFork);
    showFork();
    const previewEl = el('pre', { class: 'preview', 'data-zb': 'p8-preview' });
    const sizeEl = el('p', { 'data-zb': 'p8-size' });

    // A new tab, so this tab keeps its results (they live in memory only).
    const p9Link = el('a', { href: '#', hidden: '', target: '_blank', rel: 'noopener', 'data-zb': 'p9-link', class: 'link', text: 'Open the new chat (new tab)' });

    const reloadNote = (out) => {
      out.textContent = 'Opening a new chat… If no P3 result appears here after the new chat opens, the page reloaded (the panel restarted and lost its memory).';
    };

    body.append(
      section('p1', 'P1 · Insert text', [
        'Open a new chat (New chat in the sidebar). Click "Insert test text" and look at the message box.',
        'Press Send yourself. After the reply, click "Check last sent message": it then offers to rename the chat to zbtest/p1 (click OK).',
      ], [
        ['Insert test text', () => p.p1Insert()],
        ['Try paste instead', () => p.p1Paste()],
        ['Check last sent message', () => p.p1Check()],
      ]),
      stepsSection('p2', 'P2 · Long text', ['One new chat per size: the panel opens it itself.'], [
        {
          text: 'Click a size. The panel opens a new chat and puts the text in the box. Look: does it stay in the box, or turn into an attachment?',
          buttons: [
            ['5k', () => p.p2Insert(5000, '5k')],
            ['20k', () => p.p2Insert(20000, '20k')],
            ['100k', () => p.p2Insert(100000, '100k')],
            ['Header + transcript (20k)', () => p.p2Parts(20000, '20k')],
          ],
        },
        { text: 'Press Send yourself and wait for the reply.' },
        { text: 'Click "Check after sending", then OK in the rename dialog (the chat becomes zbtest/p2-…).', buttons: [['Check after sending', () => p.p2Check()]] },
        { text: 'For the next size, back to step 1.' },
      ]),
      section('p3', 'P3 · New chat without reload', [
        'In a zbtest chat, click "Open new chat". The panel clicks New chat itself and types a marker. Do not send it.',
        'If no P3 result appears after the new chat opens, the page reloaded.',
      ], [['Open new chat', () => p.p3(), reloadNote]]),
      stepsSection('p4', 'P4 · Rename and automatic title', ['Two new chats, A and B.'], [
        { text: 'Chat A: open a new chat, send a short first message, then click "Rename now" at once, before the reply ends.', buttons: [['Rename now', () => p.p4Rename()]] },
        { text: 'Chat B: open a new chat, send a short first message, wait until claude.ai shows its automatic title, then click "Rename now" again.' },
        { text: 'Click "Copy results" at the top and paste them to Claude: the reload of the next step empties the panel.' },
        { text: 'Reload the page (Cmd+R) and look at the sidebar. Then open each chat and click "Read title". Copy the results again, and look at the titles on your phone.', buttons: [['Read title', () => p.p4Read()]] },
      ]),
      section('p5', 'P5 · Conversation list', ['Read-only, nothing is changed. Shows counts, and only the zbtest/ titles.'], [
        ['List conversations', () => p.p5()],
      ]),
      section('p6', 'P6 · Page versus API', [
        'Read-only, nothing is changed. Open a long chat, or one with a pasted attachment, then click.',
      ], [['Compare page and API', () => p.p6()]]),
      section('p7', 'P7 · Extraction', [
        'Read-only, nothing is changed. Works on any chat. "Copy diagnostics" copies a report without message text.',
      ], [
        ['Run extractor', () => p.p7()],
        ['Copy diagnostics', async () => {
          const d = p.p7Diagnostics() || (await p.p7());
          const ok = await copy(JSON.stringify(d, null, 2), 'the diagnostics');
          return { ok, copied: ok ? 'diagnostics (no message text)' : 'copy failed' };
        }],
      ]),
      stepsSection('p8', 'P8 · Branch prompt', [
        'Two branches from one zbtest chat that has a few messages (P4\'s chat B will do): one from Claude\'s reply, one from your own message.',
      ], [
        { text: 'Open that chat. Its title must be zbtest/ and a number, such as zbtest/2 (a tree root). Only if it is not:', buttons: [['Make it a tree root', () => p.p8MakeRoot()]] },
        {
          text: 'Choose where the branch starts. By default, the last message of that kind; − and + move to an earlier or later message.',
          controls: [
            el('div', { class: 'row' }, [el('label', {}, [reply, "from Claude's reply"]), el('label', {}, [own, 'from my own message'])]),
            el('div', { class: 'row' }, [forkLabel, minus, plus, auto]),
          ],
        },
        { text: 'Build the branch\'s first message. Read the preview below the steps.', buttons: [['Build prompt', () => p.p8Build(mode())]] },
        { text: 'Open it: the panel opens a new chat and puts the message in the box. Read it, then press Send yourself. (From your own message: your message is at the end; change it if you like.)', buttons: [['Open new chat and insert', () => p.p8Open(), reloadNote]] },
        { text: 'After Claude replies, in the new chat: check the summary, then rename the branch to its address (click OK in the dialog).', buttons: [['Check summary', () => p.p8Check()], ['Rename branch', () => p.p8Rename()]] },
        { text: 'For the second branch, go back to the parent chat, choose the other option at step 2, and redo steps 3 to 5.' },
      ], {
        after: [sizeEl, previewEl],
        previewEl,
        sizeEl,
      }),
      stepsSection('p9', "P9 · claude.ai's own fork", [
        "claude.ai's \"continue branch as new chat\" (NF-1). It makes a new chat holding this one up to a message, as real messages.",
      ], [
        { text: 'Open a zbtest chat with a few messages, an image in one of them if you have one.' },
        {
          text: "Fork it: through Claude's last reply, your last message, or Claude's first reply (an earlier point, as a branch usually is).",
          buttons: [
            ["Fork through Claude's last reply", () => p.p9Fork('assistant')],
            ['Fork through my last message', () => p.p9Fork('user')],
            ["Fork through Claude's first reply", () => p.p9Fork('assistant', 'first')],
          ],
        },
        { text: 'Wait about 5 seconds, then read the new chat (it compares it with this one).', buttons: [['Read the new chat', () => p.p9Read()]] },
        { text: 'Click "Copy results" at the top and paste them to Claude. Then open the new chat with the link below (a new tab) and look. Delete the copies afterwards: they keep the original\'s title.' },
      ], { after: [p9Link], linkEl: p9Link })
    );
    pre.style.margin = '6px 10px';
    panel.append(head, pre, body);
    return el('div', { class: 'wrap' }, [pill, panel]);
  }

  function mount() {
    if (host && host.isConnected) return;
    if (!host) {
      host = document.createElement('div');
      host.id = 'zb-spike-host';
      // Styles through CSSOM and a constructed stylesheet: a strict page CSP does not block
      // those, while it could block a <style> element (kept only as a fallback).
      Object.assign(host.style, { position: 'fixed', right: '12px', bottom: '12px', zIndex: '2147483647' });
      const shadow = host.attachShadow({ mode: 'open' });
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS);
        shadow.adoptedStyleSheets = [sheet];
      } catch (e) {
        shadow.append(el('style', { text: CSS }));
      }
      shadow.append(build());
    }
    // Outside <body>, so the app's own rendering never touches it.
    document.documentElement.append(host);
  }

  global.ZBPanel = { mount, log };
})(globalThis);
