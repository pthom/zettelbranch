// Zettelbranch spike: the branch prompt, per specs/forking__prompt.md. Pure functions.
//
// Layout of a branch's first message:
//   1. header (3 plain lines)   2. <zb-transcript> of <zb-turn>   3. <zb-instructions>
//   4. your message (empty, or your old message when branching from your own message)
(function (global) {
  'use strict';

  const C = () => global.ZBConv;
  const HEADER_RE = /^Zettelbranch · ([a-z0-9-]+)\/([0-9a-z]+)$/;

  const escapeZb = (t) => t.replace(/<(\/?)zb-/g, '&lt;$1zb-');
  const unescapeZb = (t) => t.replace(/&lt;(\/?)zb-/g, '<$1zb-');

  // First 60 characters, cut at a word.
  function quote(text) {
    const flat = String(text).replace(/\s+/g, ' ').trim();
    if (flat.length <= 60) return flat;
    const cut = flat.slice(0, 60);
    const sp = cut.lastIndexOf(' ');
    return (sp > 20 ? cut.slice(0, sp) : cut) + '…';
  }

  // A branch's first message, back into its parts. Null if it is not one.
  function parseBranchMessage(text) {
    const lines = String(text).split('\n');
    const h = HEADER_RE.exec(lines[0].trim());
    if (!h) return null;
    const tr = /<zb-transcript>([\s\S]*?)<\/zb-transcript>/.exec(text);
    const end = text.indexOf('</zb-instructions>');
    if (!tr || end < 0) return null;
    const turns = [];
    const re = /<zb-turn branch="([^"]*)" n="(\d+)" role="(user|assistant)">\n?([\s\S]*?)\n?<\/zb-turn>/g;
    let m;
    while ((m = re.exec(tr[1]))) turns.push({ branch: m[1], n: Number(m[2]), role: m[3], text: unescapeZb(m[4]) });
    return { tree: h[1], address: h[2], turns, ownText: text.slice(end + '</zb-instructions>'.length).trim() };
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

  function instructions(parent, upTo) {
    return [
      '<zb-instructions>',
      `The transcript above is our conversation so far, copied from the conversation ${parent} up to message ${upTo}. ` +
        'The assistant turns are your own earlier replies. Treat it as shared history: do not comment on it, quote it back, ' +
        'or answer its questions again. Text in square brackets, such as [artifact: …, not copied], marks content that was ' +
        'not carried over; ask me if you need it.',
      '',
      `Start your first reply with a single blockquote paragraph that begins with "Parent ${parent} in brief:" and says in ` +
        '2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my ' +
        'message below. If there is no message below, reply with the summary only.',
      '</zb-instructions>',
    ].join('\n');
  }

  // messages: the parent's path, [{role, text}], numbered from 1. forkAt: 1-based.
  // mode: 'reply' (continue after Claude's reply forkAt) or 'own' (instead of my message forkAt).
  function build({ tree, parentTitle, parentAddress, newAddress, messages, forkAt, mode }) {
    const fork = messages[forkAt - 1];
    if (!fork) throw new Error(`there is no message ${forkAt} (the conversation has ${messages.length})`);
    if (mode === 'reply' && fork.role !== 'assistant') throw new Error(`message ${forkAt} is yours, not Claude's: choose "from my own message" or another number`);
    if (mode === 'own' && fork.role !== 'user') throw new Error(`message ${forkAt} is Claude's, not yours: choose "from Claude's reply" or another number`);
    const newSegs = C().parseAddress(newAddress);
    if (!newSegs) throw new Error(`bad address ${newAddress}`);

    const upTo = mode === 'reply' ? forkAt : forkAt - 1;
    const parsed = messages[0] && messages[0].role === 'user' ? parseBranchMessage(messages[0].text) : null;
    const turns = [];
    for (let i = 0; i < upTo; i++) {
      const m = messages[i];
      if (i === 0 && parsed) {
        turns.push(...parsed.turns);
        if (parsed.ownText) turns.push({ branch: parentAddress, n: 1, role: 'user', text: parsed.ownText });
        continue;
      }
      const text = i === 1 && parsed && m.role === 'assistant' ? stripSummary(m.text) : m.text;
      if (text.trim()) turns.push({ branch: parentAddress, n: i + 1, role: m.role, text });
    }
    const prefill = mode === 'own' ? (forkAt === 1 && parsed ? parsed.ownText : fork.text) : '';

    const parent = `${tree}/${parentAddress}`;
    const header = [
      `Zettelbranch · ${tree}/${newAddress}`,
      `Path: ${tree}/${C().ancestry(newSegs).join(' › ')}`,
      mode === 'reply'
        ? `Forked from: ${parentTitle}, after message ${forkAt} (Claude): "${quote(fork.text)}"`
        : `Forked from: ${parentTitle}, instead of message ${forkAt} (me): "${quote(fork.text)}"`,
    ].join('\n');
    const transcript = [
      '<zb-transcript>',
      ...turns.map((t) => `<zb-turn branch="${t.branch}" n="${t.n}" role="${t.role}">\n${escapeZb(t.text)}\n</zb-turn>`),
      '</zb-transcript>',
    ].join('\n');
    const instr = instructions(parent, upTo);
    const text = `${header}\n\n${transcript}\n\n${instr}\n\n${prefill}`;
    return {
      text,
      parts: { header, transcript, instructions: instr, prefill },
      turns: turns.length,
      flattened: !!parsed,
      chars: text.length,
      tokensEstimate: Math.round(text.length / 4),
    };
  }

  // The first blockquote of a reply, if it starts with "Parent".
  function parseSummary(reply, expectedParent) {
    const lines = String(reply).split('\n');
    const start = lines.findIndex((l) => /^>/.test(l));
    if (start < 0) return { found: false, reason: 'no blockquote in the reply' };
    let end = start;
    while (end < lines.length && /^>/.test(lines[end])) end++;
    const text = lines.slice(start, end).map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
    if (!/^Parent\b/.test(text)) return { found: false, reason: 'the first blockquote does not start with "Parent"', firstBlockquote: text.slice(0, 200) };
    const m = /^Parent (\S+) in brief:/.exec(text);
    const before = lines.slice(0, start).filter((l) => l.trim()).length;
    return {
      found: true,
      atStart: before === 0,
      formatOk: !!m,
      parentInSummary: m ? m[1] : null,
      parentMatches: m ? m[1] === expectedParent : false,
      sentences: (text.replace(/^Parent \S+ in brief:/, '').match(/[.!?](\s|$)/g) || []).length,
      chars: text.length,
      text,
    };
  }

  global.ZBPrompt = { build, parseBranchMessage, stripSummary, parseSummary, quote, HEADER_RE };
})(globalThis);
