// Zettelbranch: the branch prompt, per specs/forking__prompt.md, parsing it back, and the
// topic proposed for a branch's name. Pure functions, no DOM, no network.
//
// A branch's first message, laid out for claude.ai, which shows only code blocks, inline code
// and quotes in your messages (TL-1, TL-2, 2026-10-14):
//   1. header (3 quoted lines)
//   2. > `OUR CONVERSATION SO FAR`, then each message under a label: > `Me · tree/1a, message 3`
//   3. > `INSTRUCTIONS FOR CLAUDE`
//   4. > `MY MESSAGE`: empty, or your old message when branching instead of it
// Branches made before 0.1.4 used tags (<zb-transcript>, <zb-turn>, <zb-instructions>): they
// are still read.
(function (global) {
  'use strict';

  const T = () => global.ZBTree;
  // The header's first line, quoted (unquoted before 0.1.4). Also when the line breaks were
  // lost (0.1.2 in Firefox sent the whole first message as one line): then a space follows the
  // address.
  const HEADER_RE = /^(?:> ?)?Zettelbranch · ([a-z0-9-]+)\/([0-9a-z]+)(?=\s|$)/;

  // ---------------------------------------------------------------- the label lines

  const SECTIONS = { transcript: 'OUR CONVERSATION SO FAR', instructions: 'INSTRUCTIONS FOR CLAUDE', mine: 'MY MESSAGE' };
  const WHO = { user: 'Me', assistant: 'Claude' };
  const sectionLine = (name) => `> \`${name}\``;
  const turnLine = (tree, t) => `> \`${WHO[t.role]} · ${tree}/${t.branch}, message ${t.n}\``;
  // A label line, or a message line that looks like one, escaped by one backslash per level.
  const LABEL_RE = /^(\\*)> `(?:(Me|Claude) · [a-z0-9-]+\/([0-9a-z]+), message (\d+)|(OUR CONVERSATION SO FAR|INSTRUCTIONS FOR CLAUDE|MY MESSAGE))`[ \t]*$/;
  const escapeLabels = (t) => t.split('\n').map((l) => (LABEL_RE.test(l) ? '\\' + l : l)).join('\n');
  const unescapeLabels = (t) => t.split('\n').map((l) => { const m = LABEL_RE.exec(l); return m && m[1] ? l.slice(1) : l; }).join('\n');

  // The label lines of a message: [{ start, end, section } or { start, end, role, branch, n }],
  // start and end being the line's offsets.
  function labels(text) {
    const out = [];
    let pos = 0;
    for (const line of text.split('\n')) {
      const m = LABEL_RE.exec(line);
      if (m && !m[1]) out.push(m[5] ? { start: pos, end: pos + line.length, section: m[5] } : { start: pos, end: pos + line.length, role: m[2] === 'Me' ? 'user' : 'assistant', branch: m[3], n: Number(m[4]) });
      pos += line.length + 1;
    }
    return out;
  }

  // A code block a message leaves open (a reply cut short) is closed at its end, so that it
  // does not take in the labels and the instructions that follow.
  function closeFence(text) {
    let open = null;
    for (const line of text.split('\n')) {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (!m) continue;
      if (!open) open = m[1];
      else if (m[1][0] === open[0] && m[1].length >= open.length && !line.slice(m.index + m[0].length).trim()) open = null;
    }
    return open ? `${text}\n${open}` : text;
  }

  // Before 0.1.4: message text holding `<zb-` had `&lt;zb-` there.
  const unescapeZb = (t) => t.replace(/&lt;(\/?)zb-/g, '<$1zb-');

  // Text for one line (a quote, a list label): code-fence marks and quote markers dropped.
  const plain = (text) => String(text).replace(/```[\w+#.-]*/g, ' ').replace(/^\s*>\s?/gm, '').replace(/\s+/g, ' ').trim();

  // First 60 characters, cut at a word.
  function quote(text) {
    const flat = plain(text);
    if (flat.length <= 60) return flat;
    const cut = flat.slice(0, 60);
    const sp = cut.lastIndexOf(' ');
    return (sp > 20 ? cut.slice(0, sp) : cut) + '…';
  }

  // The header's first line, `Zettelbranch · <tree>/<address>`: { tree, address } or null.
  function parseHeader(text) {
    const h = HEADER_RE.exec(String(text).replace(/^\s+/, ''));
    return h && T().parseAddress(h[2]) ? { tree: h[1], address: h[2] } : null;
  }

  // A branch's first message, back into its parts: { tree, address, turns, ownText }. Null if
  // it is not one.
  function parseBranchMessage(text) {
    text = String(text);
    const head = parseHeader(text);
    if (!head) return null;
    return parseLabelled(text, head) || parseTagged(text, head);
  }

  // From 0.1.4: the label lines. A message is the text between its label and the next one,
  // without the blank line after the label and the one before the next.
  function parseLabelled(text, head) {
    const marks = labels(text);
    const instr = marks.findIndex((m) => m.section === SECTIONS.instructions);
    const mine = marks.findIndex((m, i) => i > instr && m.section === SECTIONS.mine);
    if (instr < 0 || mine < 0) return null;
    const from = marks.findIndex((m) => m.section === SECTIONS.transcript);
    const turns = [];
    if (from >= 0 && from < instr) {
      for (let i = from + 1; i < instr; i++) {
        const m = marks[i];
        if (!m.role) continue;
        const body = text.slice(m.end, marks[i + 1].start).replace(/^\n\n?/, '').replace(/\n\n?$/, '');
        turns.push({ branch: m.branch, n: m.n, role: m.role, text: unescapeLabels(body) });
      }
    }
    return { ...head, turns, ownText: text.slice(marks[mine].end).trim() };
  }

  // Before 0.1.4: the tags.
  function parseTagged(text, head) {
    const tr = /<zb-transcript>([\s\S]*?)<\/zb-transcript>/.exec(text);
    const end = text.indexOf('</zb-instructions>');
    if (!tr || end < 0) return null;
    const turns = [];
    const re = /<zb-turn branch="([^"]*)" n="(\d+)" role="(user|assistant)">(?:\n| )?([\s\S]*?)(?:\n| )?<\/zb-turn>/g;
    let m;
    while ((m = re.exec(tr[1]))) turns.push({ branch: m[1], n: Number(m[2]), role: m[3], text: unescapeZb(m[4]) });
    return { ...head, turns, ownText: text.slice(end + '</zb-instructions>'.length).trim() };
  }

  // Drops Claude's "> Parent … in brief:" blockquote at the top of a branch's first reply.
  function stripSummary(text) {
    const lines = String(text).split('\n');
    if (!/^>\s*Parent\b/.test(lines[0] || '')) return text;
    let i = 0;
    while (i < lines.length && /^>/.test(lines[i])) i++;
    while (i < lines.length && !lines[i].trim()) i++;
    return lines.slice(i).join('\n');
  }

  // Claude's suggestion for the branch's name: the last non-empty line of its first reply,
  // "Branch title: <3 to 6 words>". Lenient: bold or italic marks, quotes and a final period
  // are dropped. '' if that line is not there.
  function parseBranchTitle(reply) {
    const lines = String(reply).split('\n').filter((l) => l.trim());
    const m = /^[*_\s]*branch title[*_\s]*:[*_\s]*(.*?)[*_\s]*$/i.exec(lines[lines.length - 1] || '');
    if (!m) return '';
    return m[1].replace(/^[\s"'«“‘`]+|[\s"'»”’`.]+$/g, '').replace(/\s+/g, ' ').slice(0, 80).trim();
  }

  // A reply without its "Branch title:" last line (and a rule or blank lines left above it).
  function stripBranchTitle(text) {
    const lines = String(text).split('\n');
    let i = lines.length - 1;
    while (i >= 0 && !lines[i].trim()) i--;
    if (i < 0 || !parseBranchTitle(lines[i])) return text;
    lines.length = i;
    while (lines.length && (!lines[lines.length - 1].trim() || /^\s*([-*_])\1{2,}\s*$/.test(lines[lines.length - 1]))) lines.pop();
    return lines.join('\n');
  }

  // A branch's first reply as copied or listed: without the summary on top and the branch
  // title at the bottom.
  const replyBody = (text) => stripBranchTitle(stripSummary(text));

  // The first blockquote of a reply, if it starts with "Parent" (for the banner, later).
  function parseSummary(reply) {
    const lines = String(reply).split('\n');
    const start = lines.findIndex((l) => /^>/.test(l));
    if (start < 0) return null;
    let end = start;
    while (end < lines.length && /^>/.test(lines[end])) end++;
    const text = lines.slice(start, end).map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
    const m = /^Parent (\S+) in brief:\s*/.exec(text);
    return m ? { parent: m[1], text: text.slice(m[0].length) } : null;
  }

  // ---------------------------------------------------------------- a branch's name

  // Where a branch comes from, from its header: { parentTitle, parent, how, n }, for example
  // { parent: 'zbtest/1', how: 'after', n: 4 }. The parent's address from the "Path:" line,
  // else from the parent's title in the "Forked from:" line. Null if that line is not there.
  // Both are looked for anywhere before the transcript, as a message whose line breaks were
  // lost holds them on its one line.
  function parseForkedFrom(text) {
    text = String(text);
    const first = labels(text).find((m) => m.section);
    const end = first ? first.start : text.indexOf('<zb-transcript>');
    const head = end < 0 ? text : text.slice(0, end);
    const m = /(?:^|\s)Forked from: (.*?), (after|instead of) message (\d+) \((?:Claude|me)\): "/.exec(head);
    if (!m) return null;
    const path = /(?:^|\s)Path: ([a-z0-9-]+)\/([0-9a-z]+(?: › [0-9a-z]+)*)/.exec(head);
    const addrs = path ? path[2].split(' › ') : [];
    const t = T().parseTitle(m[1]);
    const parent = addrs.length >= 2 ? `${path[1]}/${addrs[addrs.length - 2]}` : t ? `${t.tree}/${t.address}` : m[1];
    return { parentTitle: m[1], parent, how: m[2], n: Number(m[3]) };
  }

  // The topic of a title that already names this branch, `<tree>/<address> · <topic>` (with
  // ` . ` or ` - ` typed by hand too). '' if the title does not name it.
  function namedTopic(title, head) {
    const t = T().parseTitle(title);
    return t && t.tree === head.tree && t.address === head.address ? t.topic.trim() : '';
  }

  // A message's first words, as a topic: at most 6 words and 50 characters, cut at a word.
  // Placeholders, Markdown marks and a trailing punctuation mark are left out.
  function shortTopic(text) {
    const own = String(text).replace(/(^|\n\n)\[(?:file|artifact|image|pasted text)\b[\s\S]*$/, '');
    const words = plain(own).replace(/[#*_`>[\]]/g, ' ').split(/\s+/).filter(Boolean);
    let out = '';
    for (const w of words.slice(0, 6)) {
      const next = out ? `${out} ${w}` : w;
      if (next.length > 50) break;
      out = next;
    }
    if (!out && words.length) out = words[0].slice(0, 50);
    return out.replace(/[\s.,:;!?…¿¡\-–—]+$/u, '');
  }

  // The first words of Claude's reply, after the summary (or of the summary, if the reply is
  // only that).
  function firstWords(reply) {
    const summary = parseSummary(reply);
    const body = replyBody(reply).trim() || (summary ? summary.text : reply);
    const words = body.replace(/[#*_`>[\]]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
    return words.slice(0, 60).replace(/[\s.,:;!?-]+$/, '');
  }

  // The topic proposed when naming a branch, and where it comes from:
  //   'current'   the branch is named already: its topic, to change it
  //   'claude'    else Claude's suggestion, the "Branch title:" line ending its first reply
  //   'question'  else the first question asked in the branch: your text after the
  //               instructions in its first message, else your next message
  //   'title'     else claude.ai's title. It describes the parent more than the branch:
  //               claude.ai names a chat from its first message, which holds the parent's
  //               conversation (seen twice on 2026-10-13)
  //   'reply'     else the first words of Claude's first reply
  // title: claude.ai's title; messages: the branch's path [{ n, role, text }]. Null if the
  // chat is not a branch, or if there is nothing to propose yet.
  function proposeTopic(title, messages) {
    const first = messages[0];
    const head = first && first.role === 'user' ? parseHeader(first.text) : null;
    if (!head) return null;
    const current = namedTopic(title, head);
    if (current) return { topic: current, from: 'current' };
    const suggested = messages[1] && messages[1].role === 'assistant' ? parseBranchTitle(messages[1].text) : '';
    if (suggested) return { topic: suggested, from: 'claude' };
    const parsed = parseBranchMessage(first.text);
    const asked = [parsed ? parsed.ownText : '', ...messages.slice(1).filter((m) => m.role === 'user').map((m) => m.text)];
    for (const q of asked) {
      const topic = shortTopic(q);
      if (topic) return { topic, from: 'question' };
    }
    const t = T().parseTitle(title);
    const own = String(t ? t.topic : title || '').replace(/\s+/g, ' ').trim();
    if (own) return { topic: own, from: 'title' };
    const reply = messages.find((m) => m.role === 'assistant');
    const words = reply ? firstWords(reply.text) : '';
    return words ? { topic: words, from: 'reply' } : null;
  }

  // ---------------------------------------------------------------- the prompt

  // upTo: the parent's last message in the transcript (0 if the transcript holds only the
  // history the parent was itself branched from).
  // Claude's suggestion for the branch's name, its first reply's last line (Pascal, 2026-10-13).
  const TITLE_LINE = 'a separate last line: "Branch title:" followed by 3 to 6 words naming what this branch is ' +
    'about, from my message below, in the language of the conversation.';

  // The lines Zettelbranch adds, as Claude is told (Pascal, 2026-10-14).
  const LAYOUT = 'Zettelbranch added the quoted lines (the header, the section names in capitals, and the label before ' +
    'each message, which says who wrote it, in which conversation and its number) for display: they are not part of ' +
    'the conversation, so do not reproduce them in your replies.';

  function instructions(parent, upTo, hasTurns) {
    if (!hasTurns) {
      // Branching from a chat's first message: no history, so no summary to ask for; your
      // message is pre-filled, so the branch title is always asked.
      return [
        `This chat is a new branch of the conversation ${parent}, started from its first message, so there is no ` +
          'earlier history. Do not comment on the quoted lines above and below; Zettelbranch added them for my own ' +
          'records. Answer my message below.',
        '',
        `End your first reply with ${TITLE_LINE}`,
      ].join('\n');
    }
    const source = upTo > 0
      ? `The transcript above is our conversation so far, copied from the conversation ${parent} up to message ${upTo}.`
      : `The transcript above is our conversation so far: the history that the conversation ${parent} was branched from, before its first message.`;
    return [
      `${source} ${LAYOUT} The messages labelled Claude are your own earlier replies. Treat it as shared history: do not comment on it, ` +
        'quote it back, or answer its questions again. Placeholders ending in "not copied", such as ' +
        '[file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a ' +
        '[pasted text: …] line is text I pasted, copied in full.',
      '',
      `Start your first reply with a single blockquote paragraph that begins with "Parent ${parent} in brief:" and says in ` +
        '2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my ' +
        'message below. If there is no message below, reply with the summary only.',
      '',
      `If there is a message below, end your first reply with ${TITLE_LINE}`,
    ].join('\n');
  }

  // messages: the parent's path [{ n, role, text }]; fork: the index of the chosen message.
  // From Claude's reply, the branch continues after it. From your own message, it replaces
  // it: the transcript stops before it, and your message is pre-filled at the end.
  // A parent that is itself a branch is flattened: its first message is parsed back into
  // the earlier turns plus your text, and its first reply loses the summary on top and the
  // branch title at the bottom.
  function build({ tree, parentTitle, parentAddress, newAddress, messages, fork }) {
    const forkMsg = messages[fork];
    if (!forkMsg) throw new Error(`there is no message at position ${fork}`);
    if (forkMsg.role !== 'user' && forkMsg.role !== 'assistant') throw new Error(`message ${forkMsg.n} is neither yours nor Claude's`);
    const newSegs = T().parseAddress(newAddress);
    if (!newSegs) throw new Error(`bad address ${newAddress}`);
    const after = forkMsg.role === 'assistant';

    const first = messages[0];
    const parsed = first.n === 1 && first.role === 'user' ? parseBranchMessage(first.text) : null;
    const last = after ? fork : fork - 1; // index of the last message copied
    const turns = parsed && fork === 0 ? [...parsed.turns] : [];
    for (let i = 0; i <= last; i++) {
      const m = messages[i];
      if (i === 0 && parsed) {
        turns.push(...parsed.turns);
        if (parsed.ownText) turns.push({ branch: parentAddress, n: 1, role: 'user', text: parsed.ownText });
        continue;
      }
      const text = i === 1 && parsed && m.role === 'assistant' ? replyBody(m.text) : m.text;
      if (text.trim()) turns.push({ branch: parentAddress, n: m.n, role: m.role, text });
    }
    const forkText = fork === 0 && parsed ? parsed.ownText : forkMsg.text;
    // A branch's first reply is quoted without Claude's summary on top and its branch title at
    // the bottom, if anything else is left.
    const quoted = after && fork === 1 && parsed ? replyBody(forkMsg.text).trim() || forkMsg.text : forkText;
    const prefill = after ? '' : forkText;

    const parent = `${tree}/${parentAddress}`;
    const header = [
      `> Zettelbranch · ${tree}/${newAddress}`,
      `> Path: ${tree}/${T().ancestry(newSegs).join(' › ')}`,
      after
        ? `> Forked from: ${parentTitle}, after message ${forkMsg.n} (Claude): "${quote(quoted)}"`
        : `> Forked from: ${parentTitle}, instead of message ${forkMsg.n} (me): "${quote(forkText)}"`,
    ].join('\n');
    // Each part is separated by a blank line; with no history, the transcript's section is left out.
    const parts = [header];
    if (turns.length) {
      parts.push(sectionLine(SECTIONS.transcript), ...turns.map((t) => `${turnLine(tree, t)}\n\n${closeFence(escapeLabels(t.text))}`));
    }
    parts.push(`${sectionLine(SECTIONS.instructions)}\n\n${instructions(parent, last >= 0 ? messages[last].n : 0, turns.length > 0)}`);
    parts.push(`${sectionLine(SECTIONS.mine)}\n\n${prefill}`);
    const text = parts.join('\n\n');
    return { text, turns: turns.length, flattened: !!parsed, chars: text.length, tokens: Math.round(text.length / 4) };
  }

  global.ZBPrompt = {
    build, parseHeader, parseBranchMessage, stripSummary, parseSummary, quote, plain, closeFence,
    parseForkedFrom, namedTopic, shortTopic, firstWords, proposeTopic, parseBranchTitle, stripBranchTitle, replyBody,
  };
})(globalThis);
