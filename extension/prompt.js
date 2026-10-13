// Zettelbranch: the branch prompt, per specs/forking__prompt.md, and parsing it back.
// Pure functions, no DOM, no network.
//
// A branch's first message:
//   1. header (3 plain lines)   2. <zb-transcript> of <zb-turn>   3. <zb-instructions>
//   4. your message (empty, or your old message when branching instead of it)
(function (global) {
  'use strict';

  const T = () => global.ZBTree;
  const HEADER_RE = /^Zettelbranch · ([a-z0-9-]+)\/([0-9a-z]+)$/;

  // Message text holding `<zb-` (a chat about this very prompt) gets `&lt;zb-` there.
  const escapeZb = (t) => t.replace(/<(\/?)zb-/g, '&lt;$1zb-');
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
    const h = HEADER_RE.exec(String(text).split('\n')[0].trim());
    return h && T().parseAddress(h[2]) ? { tree: h[1], address: h[2] } : null;
  }

  // A branch's first message, back into its parts. Null if it is not one.
  function parseBranchMessage(text) {
    text = String(text);
    const head = parseHeader(text);
    const tr = /<zb-transcript>([\s\S]*?)<\/zb-transcript>/.exec(text);
    const end = text.indexOf('</zb-instructions>');
    if (!head || !tr || end < 0) return null;
    const turns = [];
    const re = /<zb-turn branch="([^"]*)" n="(\d+)" role="(user|assistant)">\n?([\s\S]*?)\n?<\/zb-turn>/g;
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

  // upTo: the parent's last message in the transcript (0 if the transcript holds only the
  // history the parent was itself branched from).
  function instructions(parent, upTo, hasTurns) {
    if (!hasTurns) {
      // Branching from a chat's first message: no history, so no summary to ask for.
      return [
        '<zb-instructions>',
        `This chat is a new branch of the conversation ${parent}, started from its first message, so there is no ` +
          'earlier history (the transcript above is empty). Do not comment on the header lines; they are for my own ' +
          'records. Answer my message below.',
        '</zb-instructions>',
      ].join('\n');
    }
    const source = upTo > 0
      ? `The transcript above is our conversation so far, copied from the conversation ${parent} up to message ${upTo}.`
      : `The transcript above is our conversation so far: the history that the conversation ${parent} was branched from, before its first message.`;
    return [
      '<zb-instructions>',
      `${source} The assistant turns are your own earlier replies. Treat it as shared history: do not comment on it, ` +
        'quote it back, or answer its questions again. Placeholders ending in "not copied", such as ' +
        '[file: photo.png, not copied], mark content that was not carried over; ask me if you need it. Text under a ' +
        '[pasted text: …] line is text I pasted, copied in full.',
      '',
      `Start your first reply with a single blockquote paragraph that begins with "Parent ${parent} in brief:" and says in ` +
        '2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my ' +
        'message below. If there is no message below, reply with the summary only.',
      '</zb-instructions>',
    ].join('\n');
  }

  // messages: the parent's path [{ n, role, text }]; fork: the index of the chosen message.
  // From Claude's reply, the branch continues after it. From your own message, it replaces
  // it: the transcript stops before it, and your message is pre-filled at the end.
  // A parent that is itself a branch is flattened: its first message is parsed back into
  // the earlier turns plus your text, and the summary atop its first reply is dropped.
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
      const text = i === 1 && parsed && m.role === 'assistant' ? stripSummary(m.text) : m.text;
      if (text.trim()) turns.push({ branch: parentAddress, n: m.n, role: m.role, text });
    }
    const forkText = fork === 0 && parsed ? parsed.ownText : forkMsg.text;
    // A branch's first reply is quoted without Claude's summary on top, if anything follows it.
    const quoted = after && fork === 1 && parsed ? stripSummary(forkMsg.text).trim() || forkMsg.text : forkText;
    const prefill = after ? '' : forkText;

    const parent = `${tree}/${parentAddress}`;
    const header = [
      `Zettelbranch · ${tree}/${newAddress}`,
      `Path: ${tree}/${T().ancestry(newSegs).join(' › ')}`,
      after
        ? `Forked from: ${parentTitle}, after message ${forkMsg.n} (Claude): "${escapeZb(quote(quoted))}"`
        : `Forked from: ${parentTitle}, instead of message ${forkMsg.n} (me): "${escapeZb(quote(forkText))}"`,
    ].join('\n');
    const transcript = [
      '<zb-transcript>',
      ...turns.map((t) => `<zb-turn branch="${t.branch}" n="${t.n}" role="${t.role}">\n${escapeZb(t.text)}\n</zb-turn>`),
      '</zb-transcript>',
    ].join('\n');
    const instr = instructions(parent, last >= 0 ? messages[last].n : 0, turns.length > 0);
    const text = `${header}\n\n${transcript}\n\n${instr}\n\n${prefill}`;
    return { text, turns: turns.length, flattened: !!parsed, chars: text.length, tokens: Math.round(text.length / 4) };
  }

  global.ZBPrompt = { build, parseHeader, parseBranchMessage, stripSummary, parseSummary, quote, plain, escapeZb, unescapeZb };
})(globalThis);
