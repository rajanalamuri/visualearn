/* VisuaLearn text and hashing lessons: pattern matching, rolling hash, KMP, Z-algorithm, suffix arrays,
   Huffman coding, Bloom filters, count-min sketches, LRU caches and counting with hashes. */
(() => {
  'use strict';
  const { rnd, pick, distinct, shuffle, row, rows, choice, numq, yesno, plural } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });
  const chars = (s) => [...s];
  const allAt = (t, p) => { const o = []; for (let i = 0; i + p.length <= t.length; i++) if (t.startsWith(p, i)) o.push(i); return o; };

  // Small, repeatable hash functions the lessons (and tests) share.
  const bloomHash = (w, i) => ([...w].reduce((s, c) => s + c.charCodeAt(0), 0) * (i + 2) + i * 5) % 16;
  const sketchHash = (c, r) => (c.charCodeAt(0) * (r + 2) + r) % 6;

  const ALGOS = {
    naive: {
      name: 'Pattern matching',
      blurb: 'To find a short word inside a long text, slide the word along one place at a time. At each place, compare letter by letter and stop at the first mismatch.',
      facts: [['Worst case', 'O(text × word)'], ['Simple?', 'Very'], ['Wasteful when', 'Lots of near-matches']],
      code: ['for each starting place in the text', '  compare the word with the text, letter by letter', '  if a letter differs: slide on', '  if every letter matches: found here', 'no more places to try'],
      offline: off('Slide the word', 'A strip of paper with a short word, and a longer text on paper', '10 minutes', [
        'Write a text of 12 letters from A, B and C. Write a pattern of 3 letters on a paper strip.',
        'Place the strip under the start of the text. Do all three letters match? Tick or cross.',
        'Slide the strip one place right and repeat until the end.',
        'Mark every place where all three letters matched.'], 'How many comparisons would you need to find a 100-letter pattern in a million-letter text, if every place nearly matched?'),
      make() { const t = Array.from({ length: 13 }, () => pick(['A', 'B', 'C'])).join(''); const s = rnd(0, 10); return { t, p: Math.random() < 0.8 ? t.slice(s, s + 3) : 'CCC' }; },
      run(x, { t, p }) {
        const n = t.length, m = p.length, hits = []; let cmp = 0, asked = 0;
        const view = (i, ok, bad) => rows([row('text', chars(t), Object.fromEntries(chars(t).map((_, k) => [k, hits.some((h) => k >= h && k < h + m) ? 'found' : i >= 0 && k >= i && k < i + m ? (bad !== undefined && k - i === bad ? 'swap' : 'cur') : ''])), {}), row('word', [...Array(Math.max(i, 0)).fill(''), ...chars(p)], {})]);
        x.rec(view(-1), -1, `Find "${p}" in "${t}". Press play.`, null, [['Letter checks', 0]]);
        for (let i = 0; i + m <= n; i++) {
          let j = 0; while (j < m && t[i + j] === p[j]) { j++; cmp++; } if (j < m) cmp++;
          const ok = j === m;
          x.rec(view(i, ok, ok ? undefined : j), ok ? 3 : 2, ok ? `Place ${i + 1}: every letter matches. Found!` : `Place ${i + 1}: ${t[i + j]} ≠ ${p[j]} at letter ${j + 1}. Slide on.`, asked < 3 ? (asked++, yesno(`Does "${p}" match "${t.slice(i, i + m)}" here (place ${i + 1})?`, ok, ok ? 'Every letter is the same.' : `${t[i + j]} and ${p[j]} differ.`)) : null, [['Letter checks', cmp]]);
          if (ok) hits.push(i);
        }
        x.rec(view(-1), 4, hits.length ? `Found at place${hits.length === 1 ? '' : 's'} ${hits.map((h) => h + 1).join(', ')} after ${cmp} letter checks.` : `Not found. ${cmp} letter checks.`, null, [['Letter checks', cmp]]);
        x.result = { hits };
      },
    },

    rabin: {
      name: 'Rolling hash (Rabin-Karp)',
      blurb: 'Give every stretch of text a fingerprint number and compare fingerprints first. Only when two fingerprints match, check the letters. Sliding along is cheap: drop the old digit, add the new one.',
      facts: [['Fingerprint', 'A number from the digits'], ['Update', 'O(1) per slide'], ['Then', 'Check only on a match']],
      code: ['fingerprint of the word', 'fingerprint of the first stretch of text', 'for each stretch', '  if the fingerprints match: check the letters', '  slide: drop the old digit, add the new one', 'report every real match'],
      offline: off('Fingerprints', 'Digits on paper (a text of 12 digits) and a 3-digit word', '15 minutes', [
        'Write 12 digits. Pick a 3-digit pattern. Its fingerprint is its value divided by 97, remainder.',
        'Find the fingerprint of the first 3 digits of the text the same way.',
        'To slide one place: take away the old first digit\'s part (digit × 100), multiply by 10, add the new digit, and take the remainder again.',
        'Only when two fingerprints are equal, compare the digits.'], 'Two different stretches can have the same fingerprint. Why do you still check the digits?'),
      make() { const t = Array.from({ length: 12 }, () => rnd(0, 9)).join(''); const s = rnd(0, 9); return { t, p: Math.random() < 0.8 ? t.slice(s, s + 3) : '999' }; },
      run(x, { t, p }) {
        const M = 97, n = t.length, m = p.length, d = chars(t).map(Number), pd = chars(p).map(Number);
        const hv = (a) => a.reduce((h, v) => (h * 10 + v) % M, 0);
        const hp = hv(pd); let h = hv(d.slice(0, m)); const hits = []; let asked = 0, spurious = 0;
        const view = (i, hh, mark) => ({ ...rows([row('text', chars(t), Object.fromEntries(chars(t).map((_, k) => [k, hits.some((q) => k >= q && k < q + m) ? 'found' : i >= 0 && k >= i && k < i + m ? mark || 'cur' : ''])), {}), row('word', [...Array(Math.max(i, 0)).fill(''), ...chars(p)], {})]), lists: [{ label: 'Word fingerprint', items: [hp] }, { label: 'Window fingerprint', items: hh === undefined ? [] : [hh] }] });
        x.rec(view(-1), -1, `Find ${p} in ${t} using fingerprints (remainder after dividing by ${M}). Press play.`);
        x.rec(view(-1), 0, `The word ${p} has fingerprint ${hp}.`);
        for (let i = 0; i + m <= n; i++) {
          const same = h === hp;
          x.rec(view(i, h), 3, `Stretch ${t.slice(i, i + m)} has fingerprint ${h}.`, asked < 3 ? (asked++, yesno(`Fingerprint ${h} against ${hp}: equal, so we must check the digits?`, same, same ? 'Equal: it might be a match, so check the digits.' : 'Different: it can not be the word, no need to look at the digits.')) : null);
          if (same) {
            const real = t.startsWith(p, i);
            if (real) { hits.push(i); x.rec(view(i, h, 'found'), 5, `Same fingerprint and same digits: a real match at place ${i + 1}.`); } else { spurious++; x.rec(view(i, h, 'swap'), 3, `Same fingerprint but different digits: a false alarm.`); }
          }
          if (i + m < n) { h = (((h - d[i] * 100 % M + M) % M) * 10 + d[i + m]) % M; }
        }
        x.rec(view(-1), 5, hits.length ? `Matches at place${hits.length === 1 ? '' : 's'} ${hits.map((q) => q + 1).join(', ')}.` : 'No match.');
        x.result = { hits };
      },
    },

    kmp: {
      name: 'KMP (prefix table)',
      blurb: 'When a letter does not match, you already know the letters before it matched. A table made from the word tells you how far back to restart, so you never move back in the text.',
      facts: [['Time', 'O(text + word)'], ['Text pointer', 'Never goes back'], ['Needs', 'A prefix table']],
      code: ['table[i] ← length of the longest start of the word that is also an end of its first i+1 letters', 'for each letter of the text', '  while the word letter differs: fall back using the table', '  if it matches: move on in the word', '  if the whole word matched: found'],
      offline: off('Slide smartly', 'A paper strip with the word ABAB, and a text of 12 letters from A and B', '20 minutes', [
        'Build the table for ABAB. Position 3 (AB) is 0, position 3 (ABA) is 1 because A starts and ends it, position 4 (ABAB) is 2 (AB).',
        'Match the word along the text. When a mismatch happens, do not slide back: restart in the word at the table value.',
        'Mark every place where the word fully matches.'], 'Why can the text pointer never move backward?'),
      make() { return { t: Array.from({ length: 14 }, () => pick(['A', 'B'])).join(''), p: pick(['ABAB', 'AABA', 'ABA', 'AAB', 'ABB']) }; },
      run(x, { t, p }) {
        const m = p.length, lps = Array(m).fill(null); lps[0] = 0;
        const view = (i, j, hits) => ({ ...rows([row('text', chars(t), Object.fromEntries(chars(t).map((_, k) => [k, hits && hits.some((h) => k >= h && k < h + m) ? 'found' : k === i ? 'cur' : ''])), i >= 0 ? { [i]: 'i' } : {}), row('word', [...Array(Math.max(i - j, 0)).fill(''), ...chars(p)], j >= 0 ? { [Math.max(i - j, 0) + j]: 'cur' } : {}, {}), row('table', lps.map((v) => (v === null ? '' : v)), {}, Object.fromEntries(chars(p).map((c, k) => [k, c])))]), lists: [] });
        x.rec(rows([row('word', chars(p), {}), row('table', lps.map((v) => (v === null ? '' : v)), {})]), -1, `Find ${p} in ${t}. First build the table from the word. Press play.`);
        for (let i = 1, k = 0; i < m;) {
          if (p[i] === p[k]) { k++; lps[i] = k; x.rec(rows([row('word', chars(p), { [i]: 'cur', [k - 1]: 'found' }), row('table', lps.map((v) => (v === null ? '' : v)), {})]), 0, `${p[i]} continues the matching start of the word, so the table value is ${k}.`); i++; }
          else if (k) k = lps[k - 1];
          else { lps[i] = 0; x.rec(rows([row('word', chars(p), { [i]: 'cur' }), row('table', lps.map((v) => (v === null ? '' : v)), {})]), 0, `${p[i]} does not continue a matching start, so the value is 0.`); i++; }
        }
        let j = 0, steps = 0, asked = 0; const hits = [];
        x.rec(view(0, 0, hits), 1, 'The table is built. Now match along the text; the text pointer only moves forward.', numq(`In the table, what is the value at the last position of ${p}?`, lps[m - 1], [lps[m - 1] + 1, m - 1, Math.max(0, lps[m - 1] - 1)], `The longest start of ${p} that is also an end of it has ${lps[m - 1]} letter${lps[m - 1] === 1 ? '' : 's'}.`));
        for (let i = 0; i < t.length; i++) {
          while (j > 0 && t[i] !== p[j]) {
            const back = lps[j - 1];
            x.rec(view(i, j, hits), 2, `${t[i]} ≠ ${p[j]}. Fall back in the word to ${back}, not to the start.`, asked < 2 ? (asked++, numq(`Mismatch after ${j} matched letters. Where does the table say to fall back to?`, back, [j - 1 >= 0 ? j - 1 : 1, 0, back + 1], `table[${j - 1}] = ${back}.`)) : null);
            j = back; steps++;
          }
          if (t[i] === p[j]) j++;
          steps++;
          if (j === m) { hits.push(i - m + 1); x.rec(view(i, j - 1, hits), 4, `All ${m} letters matched: found at place ${i - m + 2}.`); j = lps[j - 1]; }
          else x.rec(view(i, j, hits), 3, `${t[i]} matches so far: ${j} letter${j === 1 ? '' : 's'} of the word.`);
        }
        x.rec(view(-1, -1, hits), 4, hits.length ? `Found at place${hits.length === 1 ? '' : 's'} ${hits.map((h) => h + 1).join(', ')}.` : 'Not found.');
        x.result = { hits, lps: lps.slice() };
      },
    },

    zalgo: {
      name: 'Z-algorithm',
      blurb: 'For each place in a word, the Z-number says how many letters from there match the start of the word. Remembering the longest match so far saves comparing the same letters again.',
      facts: [['Time', 'O(length)'], ['Z[i]', 'Match length with the start'], ['Used for', 'Pattern search']],
      code: ['Z[0] ← the whole word (skip it)', 'keep the window [l, r] of the furthest match', 'for each position i', '  inside the window: start from a known value', '  extend by comparing letters', '  grow the window if we passed r'],
      offline: off('How much matches the start?', 'A short word on paper', '10 minutes', [
        'Write the word AABXAAB. For each position, count how many letters in a row match the beginning of the word.',
        'Position 2 (A) matches AAB... count it.',
        'Write all the counts in a row. That is the Z row.'], 'What does a Z-value equal to the length of the pattern tell you if you search "pattern + # + text"?'),
      make() { return { s: pick(['AABXAAB', 'ABABAB', 'AAAAB', 'ABCABD', 'AABAAB']) }; },
      run(x, { s }) {
        const n = s.length, z = Array(n).fill(null); z[0] = n; let l = 0, r = 0, asked = 0;
        const view = (i, lo, hi) => rows([row('word', chars(s), Object.fromEntries(chars(s).map((_, k) => [k, k === i ? 'cur' : lo <= k && k < hi ? 'key' : ''])), { [i]: 'i' }), row('Z', z.map((v) => (v === null ? '' : v)), {})]);
        x.rec(view(-1, 0, 0), -1, `For each position of ${s}, how many letters match the start of the word? Press play.`);
        for (let i = 1; i < n; i++) {
          let k = 0; if (i < r) k = Math.min(r - i, z[i - l]);
          const startK = k; while (i + k < n && s[k] === s[i + k]) k++;
          z[i] = k; if (i + k > r) { l = i; r = i + k; }
          x.rec(view(i, l, r), startK ? 3 : 4, `Position ${i + 1}: ${k} letter${k === 1 ? '' : 's'} match the start${startK ? ` (${startK} were known from the window)` : ''}.`,
            asked < 3 && i >= 2 ? (asked++, numq(`How many letters from position ${i + 1} match the start of the word?`, k, [k + 1, Math.max(0, k - 1), k + 2], `Compare ${s.slice(i)} with ${s}: the first ${k} letter${k === 1 ? '' : 's'} agree.`)) : null);
        }
        x.rec(view(-1, 0, 0), 5, `Z row: ${z.slice(1).join(', ')} (position 1 skipped).`);
        x.result = { z: z.slice(), s };
      },
    },

    suffix: {
      name: 'Suffix arrays',
      blurb: 'Write every ending of a word and sort them like a dictionary. Words that start the same end up next to each other, so you can find them fast.',
      facts: [['Stores', 'Sorted suffix starts'], ['Search', 'O(pattern × log n)'], ['Used for', 'Text search, DNA']],
      code: ['list every suffix of the word', 'sort the suffixes alphabetically', 'to find a pattern: binary search the sorted list', 'compare the pattern with the start of the middle suffix', 'all suffixes starting with the pattern are the matches'],
      offline: off('Sorted endings', 'A short word like BANANA, paper and a pencil', '15 minutes', [
        'Write BANANA. Underneath write each ending: BANANA, ANANA, NANA, ANA, NA, A. Number them by where they start.',
        'Sort them like a dictionary: A, ANA, ANANA, BANANA, NA, NANA.',
        'To find ANA, look in the sorted list. All the endings that start with ANA are next to each other.',
        'The numbers beside them are where ANA occurs.'], 'Why are all the endings that start with the same pattern next to each other?'),
      make() { return { s: pick(['BANANA', 'ABRACA', 'PAPAYA', 'ABABAB']) }; },
      run(x, { s }) {
        const n = s.length, suf = Array.from({ length: n }, (_, i) => i), sorted = suf.slice().sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : 1));
        const lists = (ord) => [{ label: 'Suffixes (start: text)', items: ord.map((i) => `${i + 1}: ${s.slice(i)}`) }];
        x.rec({ type: 'rows', rows: [row('word', chars(s), {})], lists: lists([]) }, -1, `Every ending of ${s}, sorted, makes a search index. Press play.`);
        x.rec({ type: 'rows', rows: [row('word', chars(s), {})], lists: lists(suf) }, 0, `All ${n} endings, in the order they start (the number is where each starts).`);
        x.rec({ type: 'rows', rows: [row('word', chars(s), {})], lists: lists(sorted) }, 1, 'Sorted alphabetically, like a dictionary.', numq('Which ending comes first in alphabetical order? (Give its start number.)', sorted[0] + 1, [1, n, sorted[sorted.length - 1] + 1], `${s.slice(sorted[0])} is first alphabetically.`));
        const pat = s.slice(sorted[rnd(0, n - 1)]).slice(0, 2);
        let lo = 0, hi = n - 1, first = -1, steps = 0;
        x.rec({ type: 'rows', rows: [row('word', chars(s), {})], lists: lists(sorted) }, 2, `Find "${pat}": binary search for the first ending that is at least "${pat}".`);
        let asked = 0;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1, sub = s.slice(sorted[mid]); steps++;
          const ge = sub.slice(0, pat.length) >= pat;
          x.rec({ type: 'rows', rows: [row('sorted starts', sorted.map((i) => i + 1), Object.fromEntries(sorted.map((_, k) => [k, k === mid ? 'cur' : k < lo || k > hi ? 'out' : ''])), {})], lists: lists(sorted) }, 3, `Middle: ${sub}. Its first ${pat.length} letters are "${sub.slice(0, pat.length)}".`,
            asked < 2 ? (asked++, yesno(`Is "${sub.slice(0, pat.length)}" at least "${pat}" (alphabetically)?`, ge, ge ? 'Yes, so the first match is here or earlier.' : 'No, so it is further down the list.')) : null);
          if (ge) { first = mid; hi = mid - 1; } else lo = mid + 1;
        }
        const occ = []; for (let k = first; first >= 0 && k < n && s.slice(sorted[k]).startsWith(pat); k++) occ.push(sorted[k]);
        x.rec({ type: 'rows', rows: [row('sorted starts', sorted.map((i) => i + 1), Object.fromEntries(sorted.map((i, k) => [k, occ.includes(i) ? 'found' : ''])), {})], lists: lists(sorted) }, 4, `"${pat}" starts at place${occ.length === 1 ? '' : 's'} ${occ.map((i) => i + 1).sort((p, q) => p - q).join(', ')}, found in ${plural(steps, 'step')}.`);
        x.result = { sa: sorted.slice(), pat, occ: occ.slice().sort((p, q) => p - q) };
      },
    },

    huffman: {
      name: 'Compression (Huffman)',
      blurb: 'Give common letters short codes and rare letters long ones. Keep joining the two rarest items into one. The joins form a tree, and the path to each letter is its code of 0s and 1s.',
      facts: [['Idea', 'Short codes for common letters'], ['Method', 'Join the two smallest'], ['Result', 'Fewest bits possible']],
      code: ['put every letter in the queue with its count', 'take the two smallest items', 'join them into one item (add their counts)', 'put it back; repeat until one item is left', 'left branch = 0, right branch = 1'],
      offline: off('Make a code', 'Paper, a pencil and a short message', '20 minutes', [
        'Write a short message and count each letter.',
        'Write each letter with its count. Cross out the two smallest and replace them with one item that has their total.',
        'Repeat until one item is left. You have drawn a tree.',
        'Label left branches 0 and right branches 1. Each letter\'s code is the path from the top to it.'], 'Why does giving the common letters shorter codes make the whole message shorter?'),
      make() { const letters = shuffle(['A', 'B', 'C', 'D', 'E', 'F']).slice(0, 5); const w = distinct(5, 1, 12).sort((p, q) => q - p); return { f: letters.map((l, i) => [l, w[i]]) }; },
      run(x, { f }) {
        let nodes = f.map(([name, w]) => ({ name, w, l: null, r: null }));
        const total = f.reduce((s, [, w]) => s + w, 0);
        const lists = (extra) => [{ label: 'Queue (smallest first)', items: nodes.slice().sort((a, b) => a.w - b.w || (a.name < b.name ? -1 : 1)).map((n) => `${n.name}:${n.w}`) }, ...(extra || [])];
        x.rec({ type: 'rows', rows: [row('letters', f.map(([n]) => n), {}), row('counts', f.map(([, w]) => w), {})], lists: [] }, -1, `A message uses these letters this many times. Give each a short code. Press play.`);
        let asked = 0, merges = 0;
        while (nodes.length > 1) {
          nodes.sort((a, b) => a.w - b.w || (a.name < b.name ? -1 : 1));
          const [a, b] = nodes;
          const others = nodes.slice(2).map((n) => `${n.name}:${n.w} and ${nodes[0].name}:${nodes[0].w}`);
          x.rec({ type: 'rows', rows: [row('smallest two', [`${a.name}:${a.w}`, `${b.name}:${b.w}`], { 0: 'cur', 1: 'cur' })], lists: lists() }, 1, `The two smallest are ${a.name}:${a.w} and ${b.name}:${b.w}.`,
            asked < 2 && others.length ? (asked++, choice('Which two items does Huffman join next?', `${a.name}:${a.w} and ${b.name}:${b.w}`, others, 'It always joins the two smallest counts.')) : null);
          const m = { name: a.name + b.name, w: a.w + b.w, l: a, r: b };
          nodes = [m, ...nodes.slice(2)]; merges++;
          x.rec({ type: 'rows', rows: [row('joined', [`${m.name}:${m.w}`], { 0: 'found' })], lists: lists() }, 2, `Join them: ${m.name} with count ${m.w}.`);
        }
        const codes = {};
        (function walk(n, c) { if (!n.l) { codes[n.name] = c || '0'; return; } walk(n.l, c + '0'); walk(n.r, c + '1'); })(nodes[0], '');
        const bits = f.reduce((s, [l, w]) => s + w * codes[l].length, 0), fixed = total * Math.ceil(Math.log2(f.length));
        x.rec({ type: 'rows', rows: [row('letters', f.map(([n]) => n), {}), row('code', f.map(([n]) => codes[n]), { 0: 'found' })], lists: [] }, 4, `Common letters got short codes. The message takes ${bits} bits, against ${fixed} with equal-length codes.`);
        x.result = { codes, bits, f };
      },
    },

    bloom: {
      name: 'Bloom filters',
      blurb: 'A Bloom filter remembers words using a tiny row of bits. Each word switches on three bits. If any of a word\'s bits is off, it was definitely not added. If all are on, it was probably added.',
      facts: [['Memory', 'Tiny'], ['"No" means', 'Definitely no'], ['"Yes" means', 'Probably yes']],
      code: ['start with 16 bits, all 0', 'add: switch on the 3 bits the word points to', 'ask: look at the word\'s 3 bits', 'any bit is 0: definitely not added', 'all bits 1: probably added'],
      offline: off('Bit board', '16 small squares on paper (or coins), and some words', '15 minutes', [
        'Draw a row of 16 boxes, all empty. Make up a rule that gives each word three box numbers (like adding letter positions).',
        'To add a word, fill its three boxes.',
        'To ask about a new word, look at its three boxes. Any empty box means it was never added.',
        'If all three are filled you can only say "probably".'], 'Can a Bloom filter ever say "no" about a word that was added? Why not?'),
      make() { const ws = shuffle(['cat', 'dog', 'sun', 'owl', 'bee', 'fox', 'ant', 'pig']); return { add: ws.slice(0, 3), ask: shuffle([ws[0], ws[3], ws[4]]) }; },
      run(x, { add, ask }) {
        const bitsArr = Array(16).fill(0), idx = (w) => [0, 1, 2].map((i) => bloomHash(w, i));
        const view = (hl, mk) => ({ ...rows([row('bits', bitsArr, Object.fromEntries([...(hl || []).map((k) => [k, 'cur']), ...Object.entries(mk || {})]), Object.fromEntries(bitsArr.map((_, k) => [k, String(k)])))]), lists: [] });
        x.rec(view(), -1, 'Sixteen bits, all off. Add three words, then ask about three. Press play.');
        for (const w of add) { const ix = idx(w); ix.forEach((k) => { bitsArr[k] = 1; }); x.rec(view(ix), 1, `Add "${w}": it points at bits ${ix.join(', ')}. Switch them on.`); }
        const answers = {}; let asked = 0;
        for (const w of ask) {
          const ix = idx(w), all = ix.every((k) => bitsArr[k] === 1), real = add.includes(w);
          answers[w] = all;
          x.rec(view(ix), 2, `Ask about "${w}": bits ${ix.join(', ')}.`, asked < 3 ? (asked++, yesno(`Are all three of "${w}"'s bits (${ix.join(', ')}) on?`, all, all ? 'All three are on, so "probably yes".' : 'At least one is off, so it was definitely not added.')) : null);
          x.rec(view(ix, Object.fromEntries(ix.map((k) => [k, all ? 'found' : bitsArr[k] ? 'cur' : 'swap']))), all ? 4 : 3, all ? (real ? `All on: probably yes. And it really was added.` : `All on: probably yes. But "${w}" was never added: a false alarm, because other words switched those bits on.`) : `A bit is off: "${w}" was definitely not added.`);
        }
        x.rec(view(), 4, 'A Bloom filter never misses a word that was added, but may sometimes cry wolf.');
        x.result = { bits: bitsArr.slice(), add, ask, answers };
      },
    },

    sketch: {
      name: 'Count-min sketch',
      blurb: 'Count how often things appear in a huge stream using a small table. Each item adds 1 to one counter in each of three rows. To ask for a count, take the smallest of its three counters.',
      facts: [['Memory', 'A small fixed table'], ['Estimate', 'Never too low'], ['Answer', 'Smallest of the counters']],
      code: ['three rows of counters, all 0', 'for each item in the stream', '  add 1 to one counter in each row', 'to ask: look at its three counters', 'answer ← the smallest'],
      offline: off('Tally boards', 'Three rows of 6 boxes on paper and a stream of letters', '15 minutes', [
        'Draw three rows of 6 boxes. Make a rule for each row that sends a letter to one of its 6 boxes.',
        'For each letter in a stream, add a tally in its box in every row.',
        'To ask about a letter, look at its three boxes and take the smallest.',
        'Compare with a true count. Is the answer ever lower?'], 'Why is the smallest of the three counters the best guess?'),
      make() { const pool = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'D', 'E', 'F']; return { stream: shuffle(pool) }; },
      run(x, { stream }) {
        const T = [0, 1, 2].map(() => Array(6).fill(0));
        const view = (hl) => rows(T.map((r, i) => row(`row ${i + 1}`, r, hl ? { [hl[i]]: 'cur' } : {}, Object.fromEntries(r.map((_, k) => [k, String(k)])))));
        x.rec(view(), -1, `A stream of ${stream.length} letters goes past. Count them with three small rows. Press play.`);
        let asked = 0;
        stream.forEach((c, i) => {
          const ix = [0, 1, 2].map((r) => sketchHash(c, r));
          x.rec(view(ix), 2, `Letter ${c}: add 1 to counter ${ix.join(', ')} in rows 1, 2 and 3.`, null, [['Items', i + 1]]);
          ix.forEach((k, r) => { T[r][k]++; });
        });
        const letters = [...new Set(stream)].sort(); const est = {}, truth = {};
        for (const c of letters) { est[c] = Math.min(...[0, 1, 2].map((r) => T[r][sketchHash(c, r)])); truth[c] = stream.filter((z) => z === c).length; }
        const probe = letters[0], ix = [0, 1, 2].map((r) => sketchHash(probe, r));
        x.rec(view(ix), 3, `How many ${probe}s? Look at its three counters: ${ix.map((k, r) => T[r][k]).join(', ')}.`, numq(`The three counters for ${probe} read ${ix.map((k, r) => T[r][k]).join(', ')}. What is the estimate?`, est[probe], [Math.max(...ix.map((k, r) => T[r][k])), est[probe] + 1, truth[probe] + 2], 'Take the smallest of the three: less contaminated by other letters.'));
        x.rec(view(ix), 4, `Estimate for ${probe}: ${est[probe]}. The true count is ${truth[probe]}. The estimate is never lower than the truth.`);
        x.result = { est, truth, stream };
      },
    },

    lru: {
      name: 'Caches (LRU)',
      blurb: 'A cache is a small, fast shelf for things you use a lot. When it is full, throw out the thing you used longest ago. Every time you use something, move it to the front.',
      facts: [['Evicts', 'Least recently used'], ['Hit', 'Item already there'], ['Miss', 'Must fetch it']],
      code: ['cache holds 3 items, ordered by last use', 'item asked for:', '  in the cache (a hit): move it to the newest end', '  not there (a miss): fetch it', '    if full: remove the oldest', '    add it at the newest end'],
      offline: off('The small desk', '3 spaces on a desk, and cards A to D', '10 minutes', [
        'A desk fits only 3 cards. Someone asks for cards in a list like A B C A D B.',
        'If the card is on the desk, slide it to the newest end. If not, fetch it. If the desk is full, send away the card that has been there untouched the longest.',
        'Count hits (already on the desk) and misses.'], 'Why is "least recently used" a good guess for what you will not need next?'),
      make() { return { seq: Array.from({ length: 10 }, () => pick(['A', 'B', 'C', 'D'])) }; },
      run(x, { seq }) {
        const cap = 3; let cache = [], hits = 0, misses = 0, asked = 0;
        const view = (cur, ev) => ({ ...rows([row('requests', seq, cur >= 0 ? { [cur]: 'cur' } : {})]), lists: [{ label: 'Cache (oldest → newest)', items: cache }, { label: 'Hits / misses', items: [`${hits} / ${misses}`] }] });
        x.rec(view(-1), -1, `The cache holds ${cap} items. Requests come in. Press play.`);
        seq.forEach((c, i) => {
          const hit = cache.includes(c);
          x.rec(view(i), 1, `Request ${c}.`, asked < 4 ? (asked++, yesno(`Is ${c} in the cache right now (a hit)?`, hit, hit ? `Yes, ${c} is already there.` : `No, ${c} is not there, so it must be fetched.`)) : null);
          if (hit) { hits++; cache = cache.filter((z) => z !== c); cache.push(c); x.rec(view(i), 2, `Hit! Move ${c} to the newest end.`); }
          else {
            misses++; let ev = null;
            if (cache.length === cap) { ev = cache.shift(); }
            cache.push(c);
            x.rec(view(i), ev ? 4 : 3, ev ? `Miss. The cache was full, so ${ev} (the oldest) leaves and ${c} comes in.` : `Miss. There is room, so ${c} is added.`);
          }
        });
        x.rec(view(-1), 5, `${hits} hits and ${misses} misses.`);
        x.result = { hits, misses, cache: cache.slice(), seq };
      },
    },

    freq: {
      name: 'Counting with hashes',
      blurb: 'A hash map is like a notebook where you find things by name straight away. Look up each letter and add 1 to its tally. Then the first letter with a tally of 1 is the first that never repeats.',
      facts: [['Look-up', 'About 1 step'], ['Time', 'O(length)'], ['Instead of', 'Rescanning for each letter']],
      code: ['counts ← an empty hash map', 'for each letter: counts[letter] ← counts[letter] + 1', 'for each letter in order', '  if counts[letter] is 1: that is the answer', 'every letter repeats: no answer'],
      offline: off('Tally the letters', 'A word on paper and a pencil', '10 minutes', [
        'Write a word like SWISS... a longer one, like LETTERS.',
        'Make a list of letters and a tally column. For each letter in the word, find its row and add a tally.',
        'Now read the word again from the start. The first letter with a tally of 1 is the first letter that never repeats.'], 'Why is it better to keep a tally than to count the letter again every time you meet it?'),
      make() { return { w: pick(['LETTERS', 'BALLOON', 'SUMMER', 'PEPPER', 'TOMATO', 'STREET', 'ORANGE']) }; },
      run(x, { w }) {
        const cnt = {}, ws = chars(w); let asked = 0;
        const view = (i) => ({ ...rows([row('word', ws, i >= 0 ? { [i]: 'cur' } : {})]), lists: [{ label: 'Tally', items: Object.entries(cnt).map(([k, v]) => `${k}=${v}`) }] });
        x.rec(view(-1), -1, `Find the first letter of ${w} that appears only once. Press play.`);
        ws.forEach((c, i) => {
          cnt[c] = (cnt[c] || 0) + 1;
          x.rec(view(i), 1, `${c}: its tally is now ${cnt[c]}.`, asked < 3 && cnt[c] > 1 ? (asked++, numq(`${c} has been seen before. After this one, what is its tally?`, cnt[c], [cnt[c] + 1, 1, cnt[c] - 1], `Look ${c} up and add 1: ${cnt[c]}.`)) : null);
        });
        const first = ws.findIndex((c) => cnt[c] === 1);
        x.rec(view(-1), 2, 'Now read the word again from the start, looking up each letter in the tally.',
          choice('Which letter is the first with a tally of 1?', first >= 0 ? ws[first] : 'None', [...new Set(ws)].filter((c) => c !== ws[first]).slice(0, 3).concat(first >= 0 ? ['None'] : []), first >= 0 ? `${ws[first]} is the first letter whose tally is 1.` : 'Every letter appears more than once.'));
        x.rec(view(first), first >= 0 ? 3 : 4, first >= 0 ? `Reading again from the start, ${ws[first]} is the first letter with a tally of 1.` : 'Every letter repeats.');
        x.result = { first: first >= 0 ? ws[first] : null, w };
      },
    },
  };

  const hllHash = (v) => (v * 37 + 11) % 256;
  const lead = (h) => { let z = 0; for (let b = 7; b >= 0 && !((h >> b) & 1); b--) z++; return z; };
  ALGOS.hll = {
    name: 'HyperLogLog',
    blurb: 'How many different things went past? Scramble each one into bits and count the zeros at the start. Seeing a long run of zeros is rare, so a long run means a big crowd. One small counter gives a rough answer.',
    facts: [['Memory', 'One tiny counter'], ['Estimate', '2 to the power (zeros + 1)'], ['Used for', 'Counting visitors']],
    code: ['best ← 0', 'for each item: scramble it into 8 bits', '  count the zeros at the start', '  best ← the larger of best and that count', 'estimate ← 2 to the power (best + 1)'],
    offline: off('Rare coin runs', 'A coin', '10 minutes', [
      'Flip a coin until you get heads. Count the tails first (these are like leading zeros). Do it 8 times and write the biggest count.',
      'Now do it 32 times. Does the biggest count go up?',
      'The more people flipping, the longer the longest run. So the longest run tells you roughly how many flipped.'], 'Why does one very rare value suggest a big crowd rather than a lucky few?'),
    make() { return { v: distinct(12, 1, 200) }; },
    run(x, { v }) {
      let best = 0, asked = 0; const bin = (h) => h.toString(2).padStart(8, '0').split('');
      const view = (i, h) => ({ ...rows([row('item', v, i >= 0 ? { [i]: 'cur' } : {}), row('scrambled bits', h === undefined ? Array(8).fill('') : bin(h), h === undefined ? {} : Object.fromEntries(Array.from({ length: lead(h) }, (_, k) => [k, 'found'])))]), lists: [{ label: 'Longest zero run so far', items: [best] }] });
      x.rec(view(-1), -1, 'Estimate how many different items go past, using one counter. Press play.', null, [['Estimate', '–']]);
      v.forEach((val, i) => {
        const h = hllHash(val), z = lead(h), was = best; best = Math.max(best, z);
        x.rec(view(i, h), 3, `${val} scrambles to ${bin(h).join('')}: ${z} zero${z === 1 ? '' : 's'} at the start. ${z > was ? `A new longest run: ${best}.` : `Not longer than ${was}.`}`,
          asked < 3 && i >= 2 ? (asked++, numq(`${bin(h).join('')} starts with how many zeros?`, z, [z + 1, Math.max(0, z - 1), z + 2], `Count the 0s before the first 1: ${z}.`)) : null, [['Estimate', 2 ** (best + 1)]]);
      });
      x.rec(view(-1), 4, `Longest run: ${best}. Estimate: 2^${best + 1} = ${2 ** (best + 1)} different items. The true number is ${v.length}. One counter gives a rough guess.`, null, [['Estimate', 2 ** (best + 1)]]);
      x.result = { best, est: 2 ** (best + 1), n: v.length, v };
    },
  };

  ALGOS.aho = {
    name: 'Aho-Corasick',
    blurb: 'Search a text for many words at once. Build a trie of the words and give each node a fall-back link. Then read the text one time and never go back.',
    facts: [['Words', 'Many at once'], ['Text', 'Read once'], ['Time', 'O(text + words + matches)']],
    code: ['build a trie of all the words', 'fail link of a node ← the longest shorter ending that is also a start in the trie', 'for each letter of the text', '  while no branch for the letter: follow the fail link', '  step along the branch, then report every word that ends here (following fail links)'],
    offline: off('Many words, one pass', 'Paper, a pencil, a few short words and a text', '25 minutes', [
      'Draw a trie for the words HE, SHE, HIS and HERS.',
      'For each node, work out where to fall back to if the next letter fails: the longest ending of what you have matched that is also a start of some word.',
      'Read the text USHERS one letter at a time, moving along the trie or falling back.',
      'Every time you reach a node where a word ends (or a fall-back chain through one), note the word.'], 'Why does reading "SHE" also find "HE"?'),
    make() { return pick([{ words: ['he', 'she', 'his', 'hers'], text: 'ushers' }, { words: ['ab', 'bc', 'abc'], text: 'xabcab' }, { words: ['a', 'ab', 'bab'], text: 'cabab' }]); },
    run(x, { words, text }) {
      const root = { id: '', ch: '•', kids: {}, end: null, fail: null, d: 0 };
      for (const w of words) { let n = root; for (const c of w) { n.kids[c] = n.kids[c] || { id: n.id + c, ch: c, kids: {}, end: null, fail: null, d: n.d + 1 }; n = n.kids[c]; } n.end = w; }
      const all = []; (function c(n) { all.push(n); Object.keys(n.kids).sort().forEach((k) => c(n.kids[k])); })(root);
      const byId = new Map(all.map((n) => [n.id, n]));
      const layout = () => { let leaf = 0, maxD = 0; (function p(n) { maxD = Math.max(maxD, n.d); const ks = Object.keys(n.kids).sort(); ks.forEach((k) => p(n.kids[k])); n.x = ks.length ? ks.reduce((s, k) => s + n.kids[k].x, 0) / ks.length : leaf++; })(root); return { cols: Math.max(leaf, 1), maxD }; };
      const { cols, maxD } = layout();
      const found = [];
      const view = (cur, showFail, hi) => ({ type: 'graph', h: 90 + maxD * 62, nodes: all.map((n) => ({ id: n.id, x: 30 + (cols === 1 ? 270 : (n.x * 540) / (cols - 1)), y: 36 + n.d * 62, t: n.ch, s: n.end ? 'end' : '', c: n.id === cur ? 'cur' : hi && hi.includes(n.id) ? 'found' : n.end ? 'done' : '' })),
        edges: [...all.filter((n) => n.id).map((n) => ({ a: n.id.slice(0, -1), b: n.id })), ...all.filter((n) => showFail && n.fail && n.fail !== root && n.fail.id !== n.id.slice(0, -1) && n.fail.id !== '').map((n) => ({ a: n.id, b: n.fail.id, d: true, c: 'cut' }))],
        lists: [{ label: 'Words found', items: found.map((f) => `${f[0]}@${f[1] + 1}`) }] });
      x.rec(view(), -1, `Find ${words.join(', ')} in "${text}" in one pass. First build a trie of the words. Press play.`);
      x.rec(view(), 0, 'The trie is built. A node marked "end" finishes a word.');
      const q = [];
      for (const k of Object.keys(root.kids)) { root.kids[k].fail = root; q.push(root.kids[k]); }
      let asked = 0;
      while (q.length) {
        const u = q.shift();
        for (const k of Object.keys(u.kids).sort()) {
          const v = u.kids[k]; let f = u.fail;
          while (f !== root && !f.kids[k]) f = f.fail;
          v.fail = f.kids[k] && f.kids[k] !== v ? f.kids[k] : root; q.push(v);
        }
      }
      x.rec(view(null, true), 1, 'Fail links (dashed arrows) say where to fall back to when the next letter does not fit.');
      let st = root;
      const row0 = (i) => ({ ...rows([row('text', [...text], { [i]: 'cur' }, {})]), lists: [] });
      for (let i = 0; i < text.length; i++) {
        const c = text[i], had = !!st.kids[c];
        const hasBranch = (s) => !!s.kids[c];
        x.rec({ ...view(st.id, true), rows: [row('text', [...text], { [i]: 'cur' }, {})] }, 2, `Read "${c}". We are at "${st.id || 'the start'}".`,
          asked < 3 ? (asked++, yesno(`Does the node "${st.id || 'start'}" have a branch for "${c}"?`, had, had ? `Yes: follow it.` : `No: follow the fail link and try again, so we keep as much of what we matched as we can.`)) : null);
        while (st !== root && !st.kids[c]) { st = st.fail; x.rec({ ...view(st.id, true), rows: [row('text', [...text], { [i]: 'cur' }, {})] }, 3, `No branch for "${c}": fall back along the fail link to "${st.id || 'the start'}".`); }
        if (st.kids[c]) st = st.kids[c];
        const hits = []; for (let s = st; s && s !== root; s = s.fail) if (s.end) { hits.push(s.id); found.push([s.end, i - s.end.length + 1]); }
        x.rec({ ...view(st.id, true, hits), rows: [row('text', [...text], { [i]: 'cur' }, {})] }, 4, hits.length ? `Now at "${st.id || 'the start'}": found ${hits.join(', ')}.` : `Now at "${st.id || 'the start'}": no word ends here.`);
      }
      const sorted = found.slice().sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
      x.rec({ ...view(null, true), rows: [row('text', [...text], {}, {})] }, 4, `${sorted.length} match${sorted.length === 1 ? '' : 'es'} found while reading the text once.`);
      x.result = { found: sorted, words, text };
    },
  };

  VLLab.define('text', ALGOS);
  globalThis.VLText = { bloomHash, sketchHash, allAt, hllHash };
})();
