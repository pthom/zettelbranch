// Zettelbranch P0 spike: extract a claude.ai conversation from the DOM, as Markdown.
//
// Plain script, no modules, no dependencies. The same file runs:
//   - as a content script in the isolated world, loaded before content.js;
//   - in Node inside a jsdom window (offline-extract.mjs), through window.eval.
// It only reads the DOM. No network, no storage, no innerHTML, no innerText.
// It never reads, stores or sends credentials or session tokens (no cookies, no web storage).
// Every selector lives in SELECTORS. Nothing matches visible UI strings.
(function (global) {
  'use strict';

  const SELECTORS = {
    // Message containers, per role. Tried in order: the first candidate that matches
    // anything wins for that role. All are attributes or class names, never UI text.
    user: [
      '[data-testid="user-message"]',
      '.font-user-message',
      '[data-message-author-role="user"]',
    ],
    assistant: [
      '.font-claude-response',
      '.font-claude-message',
      '[data-testid="assistant-message"]',
      '[data-message-author-role="assistant"]',
    ],
    // Inside an assistant message: the rendered Markdown. Anything else in the message
    // (thinking, tool use, web search) is left out and recorded in `leftOut`.
    markdown: '.standard-markdown, .progressive-markdown',
    streaming: '[data-is-streaming="true"]',
    artifact: '[class*="artifact"], [data-testid*="artifact"]',
    texAnnotation: 'annotation[encoding="application/x-tex"]',
  };

  const ELEMENT = 1;
  const TEXT = 3;
  const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING

  const BLOCK = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DETAILS', 'DIV', 'DL', 'DD', 'DT',
    'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5',
    'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'SUMMARY',
    'TABLE', 'UL',
  ]);
  const SKIP = new Set([
    'BUTTON', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'INPUT', 'TEXTAREA',
    'SELECT', 'OPTION', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO', 'OBJECT', 'EMBED', 'LINK',
    'META',
  ]);

  const tagOf = (el) => String(el.tagName).toUpperCase();
  const hasClass = (el, c) => !!(el.classList && el.classList.contains(c));

  // ---------------------------------------------------------------- finding messages

  function outermost(els) {
    return els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
  }

  function pickRole(doc, candidates) {
    for (const sel of candidates) {
      const els = Array.from(doc.querySelectorAll(sel));
      if (els.length) return { selector: sel, els: outermost(els) };
    }
    return { selector: null, els: [] };
  }

  function findMessages(doc) {
    const user = pickRole(doc, SELECTORS.user);
    const assistant = pickRole(doc, SELECTORS.assistant);
    const items = [];
    const anomalies = [];
    for (const el of user.els) {
      if (assistant.els.some((a) => a.contains(el) || el.contains(a))) {
        anomalies.push('a user match is nested with an assistant match; user match dropped');
        continue;
      }
      items.push({ role: 'user', el, selector: user.selector });
    }
    for (const el of assistant.els) items.push({ role: 'assistant', el, selector: assistant.selector });
    items.sort((a, b) => (a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & FOLLOWING ? -1 : 1));
    return { items, userSelector: user.selector, assistantSelector: assistant.selector, anomalies };
  }

  // ---------------------------------------------------------------- DOM to Markdown

  function newCtx() {
    return { counts: { code: 0, table: 0, math: 0, artifact: 0, image: 0 }, leftOut: [] };
  }

  function isSkipped(el) {
    if (SKIP.has(tagOf(el))) return true;
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    return hasClass(el, 'sr-only');
  }

  function textOf(node) {
    return node.nodeValue.replace(/ /g, ' ');
  }

  // A list of Markdown blocks for the children of `parent`. Consecutive inline content is
  // grouped into one paragraph.
  function blocksOf(parent, ctx) {
    const out = [];
    let inline = '';
    const flush = () => {
      const t = inline.trim();
      if (t) out.push(t);
      inline = '';
    };
    for (const child of parent.childNodes) {
      if (child.nodeType === TEXT) {
        inline += textOf(child);
        continue;
      }
      if (child.nodeType !== ELEMENT) continue;
      const special = specialBlock(child, ctx);
      if (special !== undefined) {
        flush();
        if (special) out.push(special);
        continue;
      }
      if (isSkipped(child)) continue;
      if (isInlineMath(child)) {
        inline += inlineMath(child, ctx);
        continue;
      }
      if (BLOCK.has(tagOf(child))) {
        flush();
        out.push(...blockOf(child, ctx));
        continue;
      }
      inline += inlineOf(child, ctx);
    }
    flush();
    return out;
  }

  // Elements rendered as one unit. Returns a string, '' (drop), or undefined (not special).
  function specialBlock(el, ctx) {
    if (el.matches(SELECTORS.artifact)) return artifactBlock(el, ctx);
    if (hasClass(el, 'katex-display')) return displayMath(el, ctx);
    const tag = tagOf(el);
    if (tag === 'PRE') return codeBlock(el, '', ctx);
    if (tag === 'TABLE') return tableOf(el, ctx);
    if (tag === 'HR') return '---';
    if (tag === 'DIV') {
      const w = codeWrapper(el);
      if (w) return codeBlock(w.pre, w.label, ctx);
    }
    return undefined;
  }

  function blockOf(el, ctx) {
    const tag = tagOf(el);
    const h = /^H([1-6])$/.exec(tag);
    if (h) {
      const text = inlineChildren(el, ctx).replace(/\s*\n\s*/g, ' ').trim();
      return text ? ['#'.repeat(Number(h[1])) + ' ' + text] : [];
    }
    if (tag === 'UL' || tag === 'OL') {
      const list = listOf(el, ctx);
      return list ? [list] : [];
    }
    if (tag === 'BLOCKQUOTE') {
      const inner = blocksOf(el, ctx).join('\n\n');
      return inner ? [inner.split('\n').map((l) => (l ? '> ' + l : '>')).join('\n')] : [];
    }
    return blocksOf(el, ctx);
  }

  function listOf(el, ctx) {
    const ordered = tagOf(el) === 'OL';
    let n = ordered ? parseInt(el.getAttribute('start') || '1', 10) || 1 : 0;
    const items = [];
    for (const li of el.children) {
      if (tagOf(li) !== 'LI') continue;
      const marker = ordered ? `${n++}. ` : '- ';
      const pad = ' '.repeat(marker.length);
      const lines = blocksOf(li, ctx).join('\n').split('\n');
      items.push(marker + lines[0] + lines.slice(1).map((l) => '\n' + (l ? pad + l : '')).join(''));
    }
    return items.join('\n');
  }

  function inlineChildren(el, ctx) {
    let s = '';
    for (const c of el.childNodes) {
      if (c.nodeType === TEXT) s += textOf(c);
      else if (c.nodeType === ELEMENT) s += inlineOf(c, ctx);
    }
    return s;
  }

  function inlineOf(el, ctx) {
    if (hasClass(el, 'katex-display')) return displayMath(el, ctx).replace(/\n/g, '');
    if (isInlineMath(el)) return inlineMath(el, ctx);
    if (el.matches(SELECTORS.artifact)) return artifactBlock(el, ctx);
    if (isSkipped(el)) return '';
    switch (tagOf(el)) {
      case 'BR':
        return '\n';
      case 'STRONG':
      case 'B':
        return wrap('**', inlineChildren(el, ctx));
      case 'EM':
      case 'I':
        return wrap('*', inlineChildren(el, ctx));
      case 'DEL':
      case 'S':
      case 'STRIKE':
        return wrap('~~', inlineChildren(el, ctx));
      case 'CODE':
        return codeSpan(el.textContent);
      case 'A': {
        const text = inlineChildren(el, ctx).trim();
        const href = el.getAttribute('href') || '';
        if (!href || /^javascript:/i.test(href)) return text;
        if (!text || text === href) return href;
        return `[${text}](${href})`;
      }
      case 'IMG': {
        ctx.counts.image++;
        const alt = (el.getAttribute('alt') || '').trim();
        return `[image${alt ? ': ' + alt : ''}]`;
      }
      default:
        return inlineChildren(el, ctx);
    }
  }

  // Keep surrounding spaces outside the markers: `** x**` is not bold in Markdown.
  function wrap(marker, s) {
    if (!s.trim()) return s;
    const lead = /^\s*/.exec(s)[0];
    const trail = /\s*$/.exec(s)[0];
    return lead + marker + s.trim() + marker + trail;
  }

  function codeSpan(text) {
    const t = text.replace(/ /g, ' ').replace(/\n/g, ' ');
    const longest = Math.max(0, ...(t.match(/`+/g) || []).map((r) => r.length));
    const fence = '`'.repeat(longest + 1);
    const pad = t.startsWith('`') || t.endsWith('`') ? ' ' : '';
    return fence + pad + t + pad + fence;
  }

  // claude.ai wraps a code block in a div with a small language label and a copy button.
  // A div qualifies if it holds exactly one <pre>, no prose blocks, and at most a short
  // single-line label outside the <pre>. The label is a language name, not a UI string.
  function codeWrapper(el) {
    const pres = el.querySelectorAll('pre');
    if (pres.length !== 1) return null;
    if (el.querySelector('p, li, h1, h2, h3, h4, h5, h6, table, blockquote')) return null;
    const label = textOutside(el, pres[0]).trim();
    if (label.length > 40) return null;
    return { pre: pres[0], label: /^[\w+#.-]{1,30}$/.test(label) ? label.toLowerCase() : '' };
  }

  function textOutside(root, exclude) {
    let s = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c === exclude) continue;
        if (c.nodeType === TEXT) s += c.nodeValue + ' ';
        else if (c.nodeType === ELEMENT && !isSkipped(c)) walk(c);
      }
    })(root);
    return s.replace(/\s+/g, ' ');
  }

  function codeBlock(pre, labelLang, ctx) {
    const code = pre.querySelector('code') || pre;
    const re = /(?:^|\s)(?:language|lang)-([\w+#.-]+)/;
    const m = re.exec(code.getAttribute('class') || '') || re.exec(pre.getAttribute('class') || '');
    const lang = m ? m[1] : labelLang || '';
    // Code text, without line-number gutters if the highlighter adds them.
    let raw = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === TEXT) raw += c.nodeValue;
        else if (c.nodeType === ELEMENT && !/linenumber/i.test(c.getAttribute('class') || '')) walk(c);
      }
    })(code);
    const text = raw.replace(/ /g, ' ').replace(/\n$/, '');
    const longest = Math.max(0, ...(text.match(/`+/g) || []).map((r) => r.length));
    const fence = '`'.repeat(Math.max(3, longest + 1));
    ctx.counts.code++;
    return `${fence}${lang}\n${text}\n${fence}`;
  }

  function tableOf(table, ctx) {
    const rows = Array.from(table.querySelectorAll('tr')).filter((tr) => tr.closest('table') === table);
    if (!rows.length) return '';
    const grid = rows.map((tr) =>
      Array.from(tr.children)
        .filter((c) => /^(TD|TH)$/.test(tagOf(c)))
        .map((c) => blocksOf(c, ctx).join(' ').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim())
    );
    const width = Math.max(...grid.map((r) => r.length));
    const line = (r) => '| ' + Array.from({ length: width }, (_, i) => r[i] || '').join(' | ') + ' |';
    ctx.counts.table++;
    return [line(grid[0]), '| ' + Array(width).fill('---').join(' | ') + ' |', ...grid.slice(1).map(line)].join('\n');
  }

  function texOf(el) {
    const ann = el.querySelector(SELECTORS.texAnnotation);
    return ann ? ann.textContent.trim() : null;
  }

  function isInlineMath(el) {
    return hasClass(el, 'katex') || tagOf(el) === 'MATH';
  }

  function inlineMath(el, ctx) {
    ctx.counts.math++;
    const tex = texOf(el);
    return tex !== null ? `$${tex}$` : '[math]';
  }

  function displayMath(el, ctx) {
    ctx.counts.math++;
    const tex = texOf(el);
    return tex !== null ? `$$\n${tex}\n$$` : '[math]';
  }

  function artifactBlock(el, ctx) {
    ctx.counts.artifact++;
    let title = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (title) return;
        if (c.nodeType === TEXT) title = c.nodeValue.trim();
        else if (c.nodeType === ELEMENT && !/^(SVG|STYLE|SCRIPT)$/.test(tagOf(c)) && !hasClass(c, 'sr-only')) walk(c);
      }
    })(el);
    return `[artifact: ${title || 'untitled'}, not copied]`;
  }

  function signature(el) {
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 6).join('.');
    const tid = el.getAttribute('data-testid');
    const data = Array.from(el.attributes)
      .filter((a) => a.name.startsWith('data-') && a.name !== 'data-testid')
      .map((a) => (a.value.length <= 30 ? `${a.name}="${a.value}"` : a.name))
      .join(' ');
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}` +
      `${tid ? ` [data-testid="${tid}"]` : ''}${data ? ' [' + data + ']' : ''}`;
  }

  function visibleText(el) {
    let s = '';
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === TEXT) s += c.nodeValue;
        else if (c.nodeType === ELEMENT && !isSkipped(c)) walk(c);
      }
    })(el);
    return s.replace(/\s+/g, ' ').trim();
  }

  // Assistant message: render the Markdown parts and artifacts in order. Everything else
  // that holds text (thinking, tool use, web search, UI) is left out and recorded.
  function assistantParts(root, mdEls, ctx) {
    const out = [];
    (function walk(node) {
      for (const c of node.children) {
        if (mdEls.includes(c)) {
          out.push(...blocksOf(c, ctx));
          continue;
        }
        if (c.matches(SELECTORS.artifact)) {
          out.push(artifactBlock(c, ctx));
          continue;
        }
        if (mdEls.some((m) => c.contains(m)) || c.querySelector(SELECTORS.artifact)) {
          walk(c);
          continue;
        }
        const raw = c.textContent.replace(/\s+/g, ' ').trim().length;
        if (raw) ctx.leftOut.push({ rawChars: raw, visibleChars: visibleText(c).length, signature: signature(c) });
      }
    })(root);
    return out;
  }

  function renderMessage(item) {
    const ctx = newCtx();
    let parts = null;
    let mode = 'whole';
    if (item.role === 'assistant') {
      const md = outermost(Array.from(item.el.querySelectorAll(SELECTORS.markdown)));
      if (md.length) {
        mode = 'markdown-parts';
        parts = assistantParts(item.el, md, ctx);
      }
    }
    if (!parts) parts = blocksOf(item.el, ctx);
    const markdown = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    return { markdown, mode, ctx };
  }

  // ---------------------------------------------------------------- diagnostics

  function ancestry(el, stop) {
    const chain = [];
    for (let n = el; n && n.nodeType === ELEMENT && n !== stop; n = n.parentElement) chain.push(signature(n));
    return chain;
  }

  function commonAncestor(els) {
    if (!els.length) return null;
    for (let n = els[0].parentElement; n; n = n.parentElement) {
      if (els.every((e) => n.contains(e))) return n;
    }
    return null;
  }

  function hasLayout(doc) {
    const b = doc.body;
    return !!(b && b.getBoundingClientRect && b.getBoundingClientRect().height > 0);
  }

  function diagnose(doc, found) {
    found = found || findMessages(doc);
    const testids = {};
    const tokens = {};
    const dataAttrs = {};
    const re = /message|claude|user|human|assistant|response|markdown|artifact|think|tool|turn|virtual|code|katex|prose|chat|conversation|share|attachment|file|thumbnail|scroll/i;
    let elementCount = 0;
    let dataIndex = 0;
    let absTransform = 0;
    let bigHeights = 0;
    for (const el of doc.querySelectorAll('*')) {
      elementCount++;
      const tid = el.getAttribute('data-testid');
      if (tid) testids[tid] = (testids[tid] || 0) + 1;
      for (const a of el.attributes) if (a.name.startsWith('data-')) dataAttrs[a.name] = (dataAttrs[a.name] || 0) + 1;
      const cls = el.getAttribute('class');
      if (cls) for (const t of cls.split(/\s+/)) if (t && re.test(t)) tokens[t] = (tokens[t] || 0) + 1;
      if (el.hasAttribute('data-index')) dataIndex++;
      const st = el.getAttribute('style') || '';
      if (/position:\s*absolute/.test(st) && /transform/.test(st)) absTransform++;
      const h = /(?:^|;)\s*(?:min-)?height:\s*(\d+)px/.exec(st);
      if (h && Number(h[1]) >= 1000) bigHeights++;
    }
    const top = (o, n) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n));
    const count = (sel) => {
      try {
        return doc.querySelectorAll(sel).length;
      } catch (e) {
        return 'bad selector';
      }
    };
    const candidates = {};
    for (const sel of [...SELECTORS.user, ...SELECTORS.assistant, SELECTORS.markdown, SELECTORS.streaming,
      '[data-is-streaming]', '[data-test-render-count]', SELECTORS.artifact, 'pre', 'pre code', 'table',
      '.katex', '.katex-display', SELECTORS.texAnnotation, 'details', 'img']) {
      candidates[sel] = count(sel);
    }
    const els = found.items.map((i) => i.el);
    const lca = commonAncestor(els);
    const turns = lca
      ? Array.from(lca.children).map((c) => ({
          signature: signature(c),
          messages: found.items.filter((i) => c.contains(i.el)).map((i) => i.role).join(','),
        }))
      : [];
    const firstUser = found.items.find((i) => i.role === 'user');
    const firstAssistant = found.items.find((i) => i.role === 'assistant');
    const diag = {
      elementCount,
      candidates,
      testids: top(testids, 80),
      classTokens: top(tokens, 120),
      dataAttrs: top(dataAttrs, 80),
      listContainer: lca ? { signature: signature(lca), ancestry: ancestry(lca, doc.body), childCount: lca.children.length } : null,
      turns: turns.slice(0, 400),
      firstUserAncestry: firstUser ? ancestry(firstUser.el, lca) : null,
      firstAssistantAncestry: firstAssistant ? ancestry(firstAssistant.el, lca) : null,
      virtualization: { dataIndex, absTransform, bigHeights },
      layout: null,
    };
    if (hasLayout(doc) && els.length) {
      const view = doc.defaultView;
      const scrollers = [];
      for (let n = els[0].parentElement; n; n = n.parentElement) {
        const cs = view.getComputedStyle(n);
        if (/(auto|scroll)/.test(cs.overflowY) || n.scrollHeight > n.clientHeight + 20) {
          scrollers.push({
            signature: signature(n),
            overflowY: cs.overflowY,
            scrollHeight: n.scrollHeight,
            clientHeight: n.clientHeight,
            scrollTop: n.scrollTop,
          });
        }
      }
      diag.layout = {
        viewport: { w: view.innerWidth, h: view.innerHeight },
        documentScrollHeight: doc.documentElement.scrollHeight,
        scrollers,
        messageRects: els.slice(0, 200).map((e) => {
          const r = e.getBoundingClientRect();
          return [Math.round(r.top), Math.round(r.height)];
        }),
      };
    }
    return diag;
  }

  // ---------------------------------------------------------------- API

  function extract(doc) {
    const found = findMessages(doc);
    const messages = found.items.map((it, i) => {
      const r = renderMessage(it);
      return { index: i, role: it.role, markdown: r.markdown, mode: r.mode, counts: r.ctx.counts, leftOut: r.ctx.leftOut };
    });
    return {
      version: 1,
      url: doc.location ? String(doc.location.href) : null,
      title: doc.title,
      selectors: { user: found.userSelector, assistant: found.assistantSelector },
      anomalies: found.anomalies,
      messageCount: messages.length,
      messages,
      diag: diagnose(doc, found),
    };
  }

  function countMessages(doc) {
    return findMessages(doc).items.length;
  }

  global.ZBExtract = {
    SELECTORS,
    extract,
    countMessages,
    diagnose,
    toMarkdown: (el) => blocksOf(el, newCtx()).join('\n\n'),
  };
})(globalThis);
