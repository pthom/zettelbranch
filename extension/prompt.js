// Zettelbranch: the branch prompt, per specs/forking__prompt.md, and parsing it back.
// Pure functions, no DOM, no network.
//
// Two kinds of branch, and so two kinds of first message:
//   - a copy (build): 1. header (3 plain lines)  2. <zb-transcript> of <zb-turn>
//     3. <zb-instructions>  4. your message (empty, or your old message when branching
//     instead of it). Its header is message 1.
//   - a branch claude.ai copied itself, from a chat's last reply (buildStart): the earlier
//     messages are real messages already, so only 1. header  3. <zb-instructions>
//     4. your message. Its header is in the first message you send, after the copied ones.
(function (global) {
  'use strict';

  const T = () => global.ZBTree;
  const HEADER_RE = /^Zettelbranch · ([a-z0-9-]+)\/([0-9a-z]+)$/;
  const END = '</zb-instructions>';

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

  // A message that starts with a Zettelbranch header, back into its parts:
  // { tree, address, turns, ownText }. `turns` is its transcript, or null when it has none
  // (a branch claude.ai copied). `ownText` is what follows </zb-instructions>. Null if the
  // message is not one.
  function parseHeaderMessage(text) {
    text = String(text);
    const head = parseHeader(text);
    const end = text.indexOf(END);
    if (!head || end < 0) return null;
    const tr = /<zb-transcript>([\s\S]*?)<\/zb-transcript>/.exec(text.slice(0, end));
    let turns = null;
    if (tr) {
      turns = [];
      const re = /<zb-turn branch="([^"]*)" n="(\d+)" role="(user|assistant)">\n?([\s\S]*?)\n?<\/zb-turn>/g;
      let m;
      while ((m = re.exec(tr[1]))) turns.push({ branch: m[1], n: Number(m[2]), role: m[3], text: unescapeZb(m[4]) });
    }
    return { ...head, turns, ownText: text.slice(end + END.length).trim() };
  }

  // A copy's first message (with a transcript), back into its parts. Null if it is not one.
  function parseBranchMessage(text) {
    const p = parseHeaderMessage(text);
    return p && p.turns ? p : null;
  }

  const headerOf = (m) => (m && m.role === 'user' ? parseHeaderMessage(m.text) : null);

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

  // Which branch a chat is, from its title and messages: { tree, address, named, header,
  // fresh }, or null for a chat that is not a branch. `header` is the index of the branch's
  // own header message (-1 if none yet).
  //   - A title with a branch address (`zb/1a · …`, two segments or more): that branch. Its
  //     header is the message of yours that starts with `Zettelbranch · zb/1a`. `fresh` when
  //     there is none yet and Claude's reply is last: a branch claude.ai copied, to be started.
  //   - Otherwise a header in message 1: a copy, not named yet.
  function identify(title, messages) {
    const t = T().parseTitle(title);
    if (t && t.segs.length >= 2) {
      const header = messages.findIndex((m) => {
        const h = m.role === 'user' ? parseHeader(m.text) : null;
        return !!h && h.tree === t.tree && h.address === t.address;
      });
      const last = messages[messages.length - 1];
      return { tree: t.tree, address: t.address, named: true, header, fresh: header < 0 && !!last && last.role === 'assistant' };
    }
    const first = messages[0];
    const head = first && first.n === 1 && first.role === 'user' ? parseHeader(first.text) : null;
    if (!head) return null;
    return { ...head, named: false, header: 0, fresh: false };
  }

  // The messages of a chat, indexes 0 to `last`, as transcript turns. A message that starts
  // with a Zettelbranch header is reduced to your own text, and a transcript in it expands
  // into its turns; Claude's summary atop the reply right after it is dropped.
  // Attribution (`branch`, `n`): a message belongs to the branch of the last header message
  // before it (the header message too), n being its place in this chat. Messages before the
  // chat's first header message were copied by claude.ai from that branch's parent, at the
  // same places. A chat with no header message at all is `address` (the chat on screen).
  function flatten(messages, address, last) {
    const heads = messages.map(headerOf);
    const firstHead = heads.find(Boolean);
    let owner = address;
    if (firstHead) {
      const segs = T().parseAddress(firstHead.address);
      if (segs.length > 1) owner = T().formatAddress(segs.slice(0, -1));
    }
    const turns = [];
    for (let i = 0; i <= last; i++) {
      const m = messages[i];
      const h = heads[i];
      if (h) {
        if (h.turns) turns.push(...h.turns);
        owner = h.address;
        if (h.ownText) turns.push({ branch: owner, n: m.n, role: 'user', text: h.ownText });
        continue;
      }
      const text = i > 0 && heads[i - 1] && m.role === 'assistant' ? stripSummary(m.text) : m.text;
      if (text.trim()) turns.push({ branch: owner, n: m.n, role: m.role, text });
    }
    return turns;
  }

  // The fork message's text for a quote: a branch's first reply without Claude's summary on
  // top, if anything follows it; a header message is your own text.
  function quoted(messages, fork) {
    const m = messages[fork];
    const h = headerOf(m);
    if (h) return h.ownText;
    if (m.role === 'assistant' && fork > 0 && headerOf(messages[fork - 1])) return stripSummary(m.text).trim() || m.text;
    return m.text;
  }

  function header(tree, newSegs, forkLine) {
    return [`Zettelbranch · ${tree}/${T().formatAddress(newSegs)}`, `Path: ${tree}/${T().ancestry(newSegs).join(' › ')}`, `Forked from: ${forkLine}`].join('\n');
  }

  const summaryRequest = (parent) =>
    `Start your first reply with a single blockquote paragraph that begins with "Parent ${parent} in brief:" and says in ` +
    '2 to 4 sentences where the conversation stood at that point, in the language of the conversation. Then answer my ' +
    'message below. If there is no message below, reply with the summary only.';

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
        END,
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
      summaryRequest(parent),
      END,
    ].join('\n');
  }

  function check(messages, fork, newAddress) {
    const forkMsg = messages[fork];
    if (!forkMsg) throw new Error(`there is no message at position ${fork}`);
    if (forkMsg.role !== 'user' && forkMsg.role !== 'assistant') throw new Error(`message ${forkMsg.n} is neither yours nor Claude's`);
    const newSegs = T().parseAddress(newAddress);
    if (!newSegs) throw new Error(`bad address ${newAddress}`);
    return { forkMsg, newSegs };
  }

  // A copy. messages: the parent's path [{ n, role, text }]; fork: the index of the chosen
  // message. From Claude's reply, the branch continues after it. From your own message, it
  // replaces it: the transcript stops before it, and your message is pre-filled at the end.
  // The parent's own branch history is flattened into one list (see flatten).
  function build({ tree, parentTitle, parentAddress, newAddress, messages, fork }) {
    const { forkMsg, newSegs } = check(messages, fork, newAddress);
    const after = forkMsg.role === 'assistant';
    const last = after ? fork : fork - 1; // index of the last message copied
    const turns = flatten(messages, parentAddress, last);
    const forkHead = after ? null : headerOf(forkMsg);
    // Instead of a copy's first message: the history it was branched from, then your text.
    if (forkHead && forkHead.turns) turns.push(...forkHead.turns);
    const forkText = quoted(messages, fork);
    const prefill = after ? '' : forkText;

    const parent = `${tree}/${parentAddress}`;
    const head = header(tree, newSegs, after
      ? `${parentTitle}, after message ${forkMsg.n} (Claude): "${escapeZb(quote(forkText))}"`
      : `${parentTitle}, instead of message ${forkMsg.n} (me): "${escapeZb(quote(forkText))}"`);
    const transcript = [
      '<zb-transcript>',
      ...turns.map((t) => `<zb-turn branch="${t.branch}" n="${t.n}" role="${t.role}">\n${escapeZb(t.text)}\n</zb-turn>`),
      '</zb-transcript>',
    ].join('\n');
    const instr = instructions(parent, last >= 0 ? messages[last].n : 0, turns.length > 0);
    const text = `${head}\n\n${transcript}\n\n${instr}\n\n${prefill}`;
    const flattened = messages.slice(0, fork + 1).some((m) => !!headerOf(m));
    return { text, turns: turns.length, flattened, chars: text.length, tokens: Math.round(text.length / 4) };
  }

  // The first message of a branch claude.ai copied: the parent's messages are already in the
  // new chat, through its last one, Claude's reply. So: the header, the instructions, and an
  // empty line for your message.
  function buildStart({ tree, parentTitle, parentAddress, newAddress, messages }) {
    const fork = messages.length - 1;
    const { forkMsg, newSegs } = check(messages, fork, newAddress);
    if (forkMsg.role !== 'assistant') throw new Error('a branch claude.ai copies starts after Claude\'s last reply');
    const parent = `${tree}/${parentAddress}`;
    const head = header(tree, newSegs, `${parentTitle}, after message ${forkMsg.n} (Claude): "${escapeZb(quote(quoted(messages, fork)))}"`);
    const instr = [
      '<zb-instructions>',
      `The messages above were copied from the conversation ${parent} through message ${forkMsg.n} to start this branch. ` +
        'Do not comment on the header lines above; they are for my own records.',
      '',
      summaryRequest(parent),
      END,
    ].join('\n');
    const text = `${head}\n\n${instr}\n\n`;
    return { text, chars: text.length, tokens: Math.round(text.length / 4) };
  }

  global.ZBPrompt = {
    build, buildStart, flatten, identify, parseHeader, parseHeaderMessage, parseBranchMessage,
    stripSummary, parseSummary, quote, plain, escapeZb, unescapeZb,
  };
})(globalThis);
