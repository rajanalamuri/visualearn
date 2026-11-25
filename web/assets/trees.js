/* VisuaLearn trees lessons: traversals, lowest common ancestor, heaps, heap sort, tries, AVL trees,
   segment trees, Fenwick trees and sparse tables. */
(() => {
  'use strict';
  const { rnd, pick, distinct, row, rows, choice, numq, yesno, plural, treePos } = VLLab;
  const off = (title, need, time, steps, think) => ({ title, need, time, steps, think });

  // ---- shared helpers ----
  function bstFrom(vals) {
    let root = null;
    for (const v of vals) {
      const n = { v, l: null, r: null };
      if (!root) { root = n; continue; }
      let c = root;
      for (;;) { const k = v < c.v ? 'l' : 'r'; if (!c[k]) { c[k] = n; break; } c = c[k]; }
    }
    return root;
  }
  // A graph view of a { v, l, r } tree. marks: value -> class, subs: value -> small text.
  function treeView(root, marks = {}, subs = {}, extra = {}) {
    const { pos, h } = treePos(root);
    const nodes = [], edges = [];
    (function walk(n) {
      if (!n) return;
      const p = pos.get(n);
      nodes.push({ id: n.v, x: p.x, y: p.y, t: n.v, s: subs[n.v] ?? '', c: marks[n.v] || '' });
      for (const k of [n.l, n.r]) if (k) { edges.push({ a: n.v, b: k.v }); walk(k); }
    })(root);
    return { type: 'graph', h: Math.max(h, 120), nodes, edges, lists: extra.lists || [], rows: extra.rows };
  }
  const order = {
    pre: (n, o = []) => { if (n) { o.push(n.v); order.pre(n.l, o); order.pre(n.r, o); } return o; },
    in: (n, o = []) => { if (n) { order.in(n.l, o); o.push(n.v); order.in(n.r, o); } return o; },
    post: (n, o = []) => { if (n) { order.post(n.l, o); order.post(n.r, o); o.push(n.v); } return o; },
    level: (n) => { const o = [], q = n ? [n] : []; while (q.length) { const c = q.shift(); o.push(c.v); if (c.l) q.push(c.l); if (c.r) q.push(c.r); } return o; },
  };
  // positions for a complete binary tree stored in an array (heap order)
  const heapPos = (i, w = 540) => { const lv = Math.floor(Math.log2(i + 1)), ix = i + 1 - 2 ** lv; return { x: 30 + ((ix + 0.5) * w) / 2 ** lv, y: 36 + lv * 62 }; };
  function heapView(arr, size, marks = {}, extraRows = []) {
    const nodes = [], edges = [];
    for (let i = 0; i < size; i++) { const p = heapPos(i); nodes.push({ id: i, x: p.x, y: p.y, t: arr[i], c: marks[i] || '' }); if (i > 0) edges.push({ a: (i - 1) >> 1, b: i }); }
    const lv = Math.floor(Math.log2(Math.max(size, 1)));
    return { type: 'graph', h: 70 + lv * 62, nodes, edges, lists: [], rows: [row('array', arr.map((v, i) => (i < size ? v : '')), Object.fromEntries(Object.entries(marks).filter(([k]) => k < size)), {}), ...extraRows] };
  }

  const TRAV = {
    pre: ['Preorder', 'Visit a node first, then everything on its left, then everything on its right. Good for copying a tree.', 'Node, left, right', (v) => `Visit ${v} first, before its children.`, ['visit the node', 'preorder(left)', 'preorder(right)']],
    in: ['Inorder', 'Everything on the left, then the node, then everything on the right. On a search tree this reads the numbers from smallest to biggest.', 'Left, node, right', (v) => `The left side is done, so visit ${v}. The right side comes next.`, ['inorder(left)', 'visit the node', 'inorder(right)']],
    post: ['Postorder', 'Left, then right, then the node last. A node is visited only after all of its children. Good for deleting a tree.', 'Left, right, node', (v) => `Both sides of ${v} are done, so visit ${v} now.`, ['postorder(left)', 'postorder(right)', 'visit the node']],
    level: ['Level order', 'Visit the tree row by row, top to bottom, left to right, using a queue. Good for finding the nearest node.', 'Row by row', (v) => `${v} is next in its row.`, ['queue ← [root]', 'take the front node and visit it', 'add its children at the back']],
  };
  const travAlgo = (key) => {
    const [name, blurb, fact, say, code] = TRAV[key];
    return {
      name: `${name} traversal`, blurb,
      facts: [['Order', fact], ['Time', 'O(n)'], ['Each node', 'Visited once']],
      code,
      offline: off('Walk the tree', 'A tree drawn on paper with 7 numbers, and a finger', '10 minutes', [
        'Draw a tree with 7 numbers: one at the top, and up to two below each.',
        `Follow the rule: ${fact.toLowerCase()}. Say each number out loud as you "visit" it.`,
        'Write the numbers in the order you said them.',
        'Try the other three orders on the same tree. Are the lists the same?'], 'Which order gives a sorted list on a search tree?'),
      make() { return { v: distinct(7, 1, 60) }; },
      run(x, { v }) {
        const root = bstFrom(v), o = order[key](root), done = [];
        const view = (cur) => treeView(root, { ...Object.fromEntries(done.map((d) => [d, 'done'])), ...(cur !== undefined ? { [cur]: 'cur' } : {}) }, {}, { lists: [{ label: 'Order', items: done }] });
        x.rec(view(), -1, `Visit every node of the tree, in ${name.toLowerCase()}. Press play.`);
        o.forEach((n, i) => {
          if (i >= 1 && i % 2 === 1 && i < o.length - 1) {
            const others = o.filter((z) => z !== o[i]).slice(i);
            x.rec(view(), 1, `Visited so far: ${done.join(', ')}.`, choice('Which node is visited next?', o[i], others.length ? others : o.filter((z) => z !== o[i]), `Following ${fact.toLowerCase()}, the next node is ${o[i]}.`));
          }
          done.push(n);
          x.rec(view(n), 1, say(n));
        });
        x.rec(view(), 1, `Order: ${o.join(', ')}.`);
        x.result = o.slice();
      },
    };
  };

  const ALGOS = {
    pre: travAlgo('pre'), in: travAlgo('in'), post: travAlgo('post'), level: travAlgo('level'),

    lca: {
      name: 'Lowest common ancestor',
      blurb: 'The lowest common ancestor of two nodes is the first node they both have above them. Lift the deeper node up until both are level, then lift both together until they meet.',
      facts: [['Time', 'O(height)'], ['Idea', 'Level up, then climb together'], ['Needs', 'Parent links']],
      code: ['while the two nodes are at different depths', '  lift the deeper one to its parent', 'while the two nodes differ', '  lift both to their parents', 'where they meet is the answer'],
      offline: off('Family tree meeting', 'A family tree drawn on paper', '10 minutes', [
        'Draw a tree of 9 people, parents above children.',
        'Pick two people. Put a finger on each.',
        'Move the finger on the lower person up until both fingers are on the same generation.',
        'Move both fingers up one parent at a time until they land on the same person. That is the lowest common ancestor.'], 'Why does lifting the deeper node first make the climb together work?'),
      make() { const v = distinct(9, 1, 80); const s = v.slice().sort(() => Math.random() - 0.5); return { v, a: s[0], b: s[1] }; },
      run(x, { v, a, b }) {
        const root = bstFrom(v), par = new Map(), dep = new Map();
        (function w(n, p, d) { if (!n) return; par.set(n.v, p); dep.set(n.v, d); w(n.l, n.v, d + 1); w(n.r, n.v, d + 1); })(root, null, 0);
        let p = a, q = b; const seen = new Set([a, b]); let asked = 0;
        const view = () => treeView(root, { ...Object.fromEntries([...seen].map((s) => [s, 'seen'])), [p]: 'cur', [q]: 'alt' }, Object.fromEntries([...dep].map(([k, d]) => [k, `d${d}`])), { lists: [{ label: 'Pointers', items: [`A at ${p} (depth ${dep.get(p)})`, `B at ${q} (depth ${dep.get(q)})`] }] });
        x.rec(view(), -1, `Find the lowest common ancestor of ${a} and ${b}. Each node shows its depth (d). A is yellow, B purple.`);
        while (dep.get(p) !== dep.get(q)) {
          const deeperA = dep.get(p) > dep.get(q);
          const qn = asked < 2 ? (asked++, choice('The depths differ. Which pointer climbs?', deeperA ? 'A (the deeper one)' : 'B (the deeper one)', [deeperA ? 'B (the shallower one)' : 'A (the shallower one)'], 'Lift the deeper one first, so both end up on the same row.')) : null;
          if (deeperA) p = par.get(p); else q = par.get(q);
          seen.add(p); seen.add(q);
          x.rec(view(), 1, `${deeperA ? 'A' : 'B'} was deeper, so it lifts to its parent.`, qn);
        }
        while (p !== q) {
          p = par.get(p); q = par.get(q); seen.add(p); seen.add(q);
          x.rec(view(), 3, `Same depth, different nodes. Lift both: A to ${p}, B to ${q}.`);
        }
        x.rec({ ...view(), nodes: view().nodes.map((n) => ({ ...n, c: n.id === p ? 'found' : n.c })) }, 4, `They meet at ${p}. That is the lowest common ancestor.`);
        x.result = p;
      },
    },

    heap: {
      name: 'Heaps and priority queues',
      blurb: 'A heap keeps the smallest number at the top. A new number goes in at the bottom and swaps upward while it is smaller than its parent. To take the smallest, remove the top and sift the last number down.',
      facts: [['Smallest', 'Always on top'], ['Add or remove', 'O(log n)'], ['Stored as', 'A plain array']],
      code: ['add: put the new number at the end', '  while it is smaller than its parent: swap up', 'remove: take the top', '  move the last number to the top', '  while it is bigger than a child: swap with the smaller child'],
      offline: off('The family pyramid', 'Number cards and a pyramid drawn on paper', '15 minutes', [
        'Draw a pyramid: 1 box on top, 2 below, 4 below those. Boxes are filled left to right.',
        'Place each new card in the next empty box. If it is smaller than the card above it, swap them, and repeat.',
        'After 7 cards, the smallest is on top. Take it. Put the last card on top and sink it by swapping with its smaller child.',
        'The new top is the second smallest.'], 'Where in the pyramid can the third smallest number be?'),
      make() { return { v: distinct(7, 1, 60) }; },
      run(x, { v }) {
        const h = [], out = []; let asked = 0;
        const lists = () => [{ label: 'Taken out', items: out }];
        const view = (m) => ({ ...heapView(h, h.length, m || {}), lists: lists() });
        x.rec(view(), -1, 'A min-heap keeps the smallest on top. Add 7 numbers, then take two out. Press play.');
        for (const n of v) {
          h.push(n); let i = h.length - 1;
          x.rec(view({ [i]: 'cur' }), 0, `Add ${n} at the end of the array, the next free spot.`);
          while (i > 0) {
            const p = (i - 1) >> 1;
            const swap = h[i] < h[p];
            x.rec(view({ [i]: 'cur', [p]: 'alt' }), 1, `${h[i]} against its parent ${h[p]}.`, asked < 3 ? (asked++, yesno(`Is ${h[i]} smaller than its parent ${h[p]}? Should they swap?`, swap, swap ? `${h[i]} < ${h[p]}: the smaller number belongs higher up.` : `${h[i]} is not smaller, so it stays.`)) : null);
            if (!swap) break;
            [h[i], h[p]] = [h[p], h[i]]; i = p;
            x.rec(view({ [i]: 'swap' }), 1, `Swap: ${h[i]} moves up.`);
          }
        }
        x.rec(view({ 0: 'found' }), -1, `The heap is built. The smallest, ${h[0]}, is on top.`);
        for (let t = 0; t < 2; t++) {
          const top = h[0]; out.push(top);
          const last = h.pop();
          x.rec(view(), 2, `Take out the top, ${top}.`, t === 0 ? numq('Which number leaves the heap first?', top, [h[1], h[2], last].filter((z) => z !== undefined), `The smallest number is always on top: ${top}.`) : null);
          if (h.length) {
            h[0] = last; let i = 0;
            x.rec(view({ 0: 'cur' }), 3, `Move the last number, ${last}, to the top.`);
            for (;;) {
              const l = 2 * i + 1, r = l + 1; let s = i;
              if (l < h.length && h[l] < h[s]) s = l;
              if (r < h.length && h[r] < h[s]) s = r;
              if (s === i) break;
              [h[i], h[s]] = [h[s], h[i]]; i = s;
              x.rec(view({ [i]: 'swap' }), 4, `Swap with the smaller child. ${h[i]} sinks.`);
            }
          }
        }
        x.rec(view({ 0: 'found' }), -1, `Out: ${out.join(', ')}. The new smallest is ${h[0]}.`);
        x.result = { heap: h.slice(), out: out.slice() };
      },
    },

    heapsort: {
      name: 'Heap sort',
      blurb: 'Turn the row into a heap with the biggest on top. Swap the top with the last place, and that last number is finished. Sift the new top down to fix the heap. Repeat until all are finished.',
      facts: [['Time', 'O(n log n)'], ['Extra memory', 'None'], ['Compares', 'Parent against children']],
      code: ['build a max-heap (biggest on top)', 'repeat:', '  swap the top with the last unfinished place', '  that place is now finished', '  sift the new top down to rebuild the heap'],
      offline: off('Pyramid sort', 'Number cards (7) and a pyramid drawn on paper', '15 minutes', [
        'Fill the pyramid with the cards, then fix it so every card is bigger than the cards below it.',
        'Swap the top card with the last card in the pyramid. Set that card aside: it is the biggest.',
        'Sink the new top card down until the pyramid is in order again.',
        'Keep going. The cards you set aside, read backward, are sorted.'], 'Why is the biggest card always on top of a max-heap?'),
      make() { return { a: distinct(7, 1, 60) }; },
      run(x, { a }) {
        const h = a.slice(), n = h.length; let size = n, asked = 0;
        const view = (m) => { const mk = { ...m }; for (let i = size; i < n; i++) mk[i] = 'done'; const v = heapView(h, size, m || {}); v.rows = [row('array', h, mk, {})]; return v; };
        const sift = (i, end, tag) => {
          for (;;) {
            const l = 2 * i + 1, r = l + 1; let s = i;
            if (l < end && h[l] > h[s]) s = l;
            if (r < end && h[r] > h[s]) s = r;
            if (s === i) break;
            [h[i], h[s]] = [h[s], h[i]];
            x.rec(view({ [s]: 'swap' }), tag, `${h[s]} is bigger than ${h[i]}, so swap them.`);
            i = s;
          }
        };
        x.rec(view(), -1, 'Sort the row with a heap. First make the biggest number rise to the top. Press play.');
        for (let i = (n >> 1) - 1; i >= 0; i--) { x.rec(view({ [i]: 'cur' }), 0, `Fix the heap below position ${i + 1}.`); sift(i, n, 0); }
        x.rec(view({ 0: 'found' }), 0, `Heap built. The biggest, ${h[0]}, is on top.`);
        for (let end = n - 1; end > 0; end--) {
          const mx = Math.max(...h.slice(0, end + 1));
          x.rec(view({ 0: 'found' }), 2, `The top is the biggest of the unfinished numbers.`, asked < 2 ? (asked++, numq('Which number is on top of the heap right now?', h[0], [h[1], h[2], h[end]].filter((z) => z !== h[0]), `A max-heap keeps the biggest on top: ${mx}.`)) : null);
          [h[0], h[end]] = [h[end], h[0]]; size = end;
          x.rec(view({ [end]: 'done' }), 3, `Swap the top with the last place. ${h[end]} is finished.`);
          sift(0, end, 4);
        }
        size = n;
        x.rec(view(), -1, `Sorted: ${h.join(', ')}.`);
        x.result = h.slice();
      },
    },

    trie: {
      name: 'Tries',
      blurb: 'A trie stores words letter by letter along a path. Words that start the same share the same first steps. To find every word with a given start, walk down the prefix and collect everything below.',
      facts: [['Find a prefix', 'O(length of prefix)'], ['Shared starts', 'Stored once'], ['Used for', 'Autocomplete']],
      code: ['start at the root', 'for each letter of the word', '  follow that letter, or make a new branch', 'mark the last node as a word end', 'to search a prefix: follow its letters, then collect words below'],
      offline: off('Autocomplete tree', 'Paper and a pencil, and 4 short words', '15 minutes', [
        'Pick 4 words that share some starting letters, like CAT, CAR, COW, DOG.',
        'Draw a dot at the top. For each word, follow or draw one branch per letter. Reuse a branch if it already exists.',
        'Mark the end of each word with a circle.',
        'Pick a prefix like CA. Walk down it and list every word you can reach below.'], 'How much work does it take to find all the words starting with CA when there are a million words?'),
      make() { return { words: pick([['cat', 'car', 'cow', 'dog'], ['tea', 'ten', 'to', 'toy'], ['sun', 'sit', 'sad', 'sea'], ['bat', 'ball', 'bar', 'bee']]) }; },
      run(x, { words }) {
        const root = { ch: '•', kids: {}, end: false, id: '' };
        const nodes = () => {
          const out = [], edges = []; let leaf = 0, maxD = 0;
          (function w(n, d) {
            const ks = Object.keys(n.kids).sort();
            maxD = Math.max(maxD, d);
            ks.forEach((k) => w(n.kids[k], d + 1));
            n.x = ks.length ? ks.reduce((s, k) => s + n.kids[k].x, 0) / ks.length : leaf++;
            n.d = d;
          })(root, 0);
          const cols = Math.max(leaf, 1);
          (function w(n) {
            out.push(n);
            for (const k of Object.keys(n.kids).sort()) { edges.push({ a: n.id, b: n.kids[k].id }); w(n.kids[k]); }
          })(root);
          return { out, edges, cols, maxD };
        };
        const view = (cur, found, walk) => {
          const { out, edges, cols, maxD } = nodes();
          return { type: 'graph', h: 90 + maxD * 62, nodes: out.map((n) => ({ id: n.id, x: 30 + (cols === 1 ? 270 : (n.x * 540) / (cols - 1)), y: 36 + n.d * 62, t: n.ch, s: n.end ? 'end' : '', c: found && found.includes(n.id) ? 'found' : n.id === cur ? 'cur' : walk && walk.includes(n.id) ? 'seen' : n.end ? 'done' : '' })), edges, lists: [] };
        };
        x.rec(view(), -1, `Store the words ${words.join(', ')} in a trie. Press play.`);
        let asked = 0;
        for (const w of words) {
          let n = root;
          for (let i = 0; i < w.length; i++) {
            const ch = w[i], has = !!n.kids[ch];
            if (i > 0 && asked < 3) { asked++; x.rec(view(n.id), 2, `Adding "${w}", at ${w.slice(0, i) || 'the root'}. Next letter: ${ch}.`, yesno(`Is there already a branch for "${ch}" here?`, has, has ? 'Yes: words that start the same share their first steps.' : `No branch for "${ch}" yet, so we make one.`)); }
            if (!has) n.kids[ch] = { ch, kids: {}, end: false, id: n.id + ch };
            n = n.kids[ch];
            x.rec(view(n.id), 2, has ? `Follow the existing "${ch}" branch.` : `Make a new "${ch}" branch.`);
          }
          n.end = true;
          x.rec(view(n.id), 3, `"${w}" is stored. This node ends a word.`);
        }
        const prefix = words[0].slice(0, 2);
        let n = root; const walk = [''];
        for (const ch of prefix) { n = n.kids[ch]; walk.push(n.id); x.rec(view(n.id, null, walk), 4, `Searching the prefix "${prefix}": follow "${ch}".`); }
        const found = [], got = [];
        (function collect(m) { if (m.end) { found.push(m.id); got.push(m.id); } for (const k of Object.keys(m.kids).sort()) collect(m.kids[k]); })(n);
        x.rec(view(null, found, walk), 4, `Every word below is a match: ${got.join(', ')}.`);
        x.result = { prefix, words: got };
      },
    },

    avl: {
      name: 'Balanced trees (AVL)',
      blurb: 'A search tree stays fast only if it stays bushy. Adding numbers in order would make a lopsided stick. An AVL tree watches the height on each side of every node, and rotates the tree when one side gets two taller.',
      facts: [['Height', 'About log₂ n'], ['Find or add', 'O(log n)'], ['Fix', 'Rotate']],
      code: ['add the number like a normal search tree', 'going back up, check each node: left height − right height', 'if it is 2 or −2, this node is lopsided', 'rotate it to even the sides out', 'the tree is balanced again'],
      offline: off('Tip the tree', 'Paper, a pencil and 6 numbers in increasing order', '15 minutes', [
        'Draw a search tree by adding 10, 20, 30 in that order. It is a stick leaning right.',
        'The top node has nothing on its left but two levels on its right. Rotate: make 20 the top, with 10 on its left and 30 on its right.',
        'Keep adding 40, 50, 60. Every time one side gets two levels taller than the other, rotate.',
        'Count the height of your tree and compare with a plain stick of 6.'], 'Why is a stick of 1000 numbers so much slower to search than a balanced tree of 1000?'),
      make() { return { v: distinct(6, 1, 90).sort((p, q) => p - q) }; },
      run(x, { v }) {
        let root = null;
        const h = (n) => (n ? n.h : 0), upd = (n) => { n.h = 1 + Math.max(h(n.l), h(n.r)); }, bf = (n) => h(n.l) - h(n.r);
        const rotR = (y) => { const z = y.l; y.l = z.r; z.r = y; upd(y); upd(z); return z; };
        const rotL = (y) => { const z = y.r; y.r = z.l; z.l = y; upd(y); upd(z); return z; };
        const subs = () => { const o = {}; (function w(n) { if (n) { o[n.v] = bf(n) > 0 ? `+${bf(n)}` : String(bf(n)); w(n.l); w(n.r); } })(root); return o; };
        const view = (marks) => ({ ...treeView(root, marks || {}, subs()), lists: [{ label: 'Height', items: [root ? root.h : 0] }] });
        x.rec({ type: 'rows', rows: [row('numbers to add', v, {})], lists: [] }, -1, `Add ${v.join(', ')} in order. A plain tree would become a stick. Small numbers show how lopsided each node is. Press play.`);
        let rotations = 0, asked = 0;
        for (const n of v) {
          const path = [];
          const ins = (t) => { if (!t) return { v: n, l: null, r: null, h: 1 }; path.push(t); if (n < t.v) t.l = ins(t.l); else t.r = ins(t.r); upd(t); return t; };
          root = root ? ins(root) : ins(null);
          x.rec(view({ [n]: 'cur' }), 0, `Add ${n}.`);
          const idx = path.slice().reverse().findIndex((p) => Math.abs(bf(p)) > 1);
          if (idx >= 0) {
            const zi = path.length - 1 - idx, z = path[zi];
            x.rec(view({ [z.v]: 'swap' }), 2, `${z.v} is lopsided: one side is two levels taller.`, asked < 2 ? (asked++, yesno(`Is ${z.v} out of balance (a difference of 2)?`, true, `Its left side is ${h(z.l)} tall and its right side is ${h(z.r)}. That differs by 2, so we rotate.`)) : null);
            let nr;
            if (bf(z) > 1) { if (bf(z.l) < 0) z.l = rotL(z.l); nr = rotR(z); } else { if (bf(z.r) > 0) z.r = rotR(z.r); nr = rotL(z); }
            const par = zi > 0 ? path[zi - 1] : null;
            if (!par) root = nr; else if (par.l === z) par.l = nr; else par.r = nr;
            for (let k = zi - 1; k >= 0; k--) upd(path[k]);
            rotations++;
            x.rec(view({ [nr.v]: 'found' }), 3, `Rotate. ${nr.v} becomes the top of this part, and the sides even out.`);
          }
        }
        const inorder = order.in(root);
        const balanced = (function chk(n) { return !n || (Math.abs(bf(n)) <= 1 && chk(n.l) && chk(n.r)); })(root);
        x.rec(view(), 4, `Height ${root.h} instead of ${v.length} for a plain stick, after ${plural(rotations, 'rotation')}.`);
        x.result = { height: root.h, inorder, balanced };
      },
    },

    segment: {
      name: 'Segment trees',
      blurb: 'A segment tree stores the sum of every dyadic chunk of a row: the whole row at the top, halves below, and single numbers at the bottom. Any stretch is then answered by combining a few chunks.',
      facts: [['Build', 'O(n)'], ['Range query', 'O(log n)'], ['Update one number', 'O(log n)']],
      code: ['leaves hold the numbers', 'each parent holds the sum of its two children', 'query(range): if a chunk is fully inside, use it', 'if it only partly overlaps, ask both children', 'if it is outside, skip it'],
      offline: off('Sum pyramid', 'Paper and 8 numbers', '15 minutes', [
        'Write 8 numbers in a row. Above each pair, write their sum. Above each pair of sums, write their sum. The top is the total.',
        'Pick a stretch, like numbers 3 to 7. Find the biggest boxes that fit entirely inside it.',
        'Add just those boxes. Check with a slow sum.'], 'How many boxes do you add for the stretch 1 to 7 of 8 numbers?'),
      make() { const l = rnd(1, 3), r = rnd(4, 6); return { a: Array.from({ length: 8 }, () => rnd(1, 9)), l, r }; },
      run(x, { a, l, r }) {
        const n = a.length, T = Array(2 * n).fill(null), rng = (i) => { let lo = i, hi = i; while (lo < n) { lo *= 2; hi = hi * 2 + 1; } return [lo - n, hi - n]; };
        for (let i = 0; i < n; i++) T[n + i] = a[i];
        const view = (marks) => ({ type: 'graph', h: 250, nodes: Array.from({ length: 2 * n - 1 }, (_, k) => k + 1).map((id) => { const p = heapPos(id - 1); const [lo, hi] = rng(id); return { id, x: p.x, y: p.y, t: T[id] === null ? '?' : T[id], s: `${lo}-${hi}`, c: (marks && marks[id]) || '' }; }), edges: Array.from({ length: 2 * n - 2 }, (_, k) => ({ a: (k + 2) >> 1, b: k + 2 })), lists: [] });
        x.rec(view(), -1, `Build a sum tree over 8 numbers. Small numbers show each box's range (positions 0 to 7). Press play.`);
        for (let i = n - 1; i >= 1; i--) { T[i] = T[2 * i] + T[2 * i + 1]; x.rec(view({ [i]: 'cur', [2 * i]: 'seen', [2 * i + 1]: 'seen' }), 1, `${T[2 * i]} + ${T[2 * i + 1]} = ${T[i]}, the sum of positions ${rng(i)[0]} to ${rng(i)[1]}.`); }
        x.rec(view({ 1: 'found' }), 1, `The top box holds the total, ${T[1]}.`);
        x.rec(view(), 2, `Query: the sum of positions ${l} to ${r}.`);
        let total = 0, asked = 0; const marks = {};
        (function q(id) {
          const [lo, hi] = rng(id);
          if (hi < l || lo > r) { marks[id] = 'out'; x.rec(view({ ...marks }), 4, `Positions ${lo} to ${hi} are outside the query. Skip.`); return; }
          if (l <= lo && hi <= r) { total += T[id]; marks[id] = 'found'; x.rec(view({ ...marks }), 2, `Positions ${lo} to ${hi} fit inside. Use ${T[id]}. Total ${total}.`); return; }
          x.rec(view({ ...marks, [id]: 'cur' }), 3, `Positions ${lo} to ${hi} overlap only partly. Ask both halves.`, asked < 2 ? (asked++, yesno(`Is positions ${lo} to ${hi} completely inside ${l} to ${r}?`, false, 'Only part of it is inside, so we have to split it.')) : null);
          q(2 * id); q(2 * id + 1);
        })(1);
        x.rec(view({ ...marks }), 2, `The sum of positions ${l} to ${r} is ${total}.`);
        x.result = { sum: total, l, r };
      },
    },

    fenwick: {
      name: 'Fenwick trees',
      blurb: 'A Fenwick tree (or BIT) stores running totals in a clever way: cell i holds the sum of the last (lowest set bit of i) numbers. A prefix sum then needs only a few cells, found by stripping the lowest set bit.',
      facts: [['Prefix sum', 'O(log n)'], ['Memory', 'Same as the row'], ['Trick', 'i − (i & −i)']],
      code: ['T[i] = sum of the last (lowest set bit of i) numbers', 'prefix(k): total ← 0, i ← k', 'while i > 0:', '  total ← total + T[i]', '  i ← i − (lowest set bit of i)'],
      offline: off('Binary jumps', 'Paper and 8 numbers', '15 minutes', [
        'Write numbers at positions 1 to 8. Under position 4 write the sum of positions 1 to 4. Under position 6 write the sum of positions 5 and 6.',
        'For position 7 you only need positions 5 to 7... find the pattern: the box under position i covers a block that ends at i, whose length is the biggest power of 2 dividing i.',
        'To add up the first 7 numbers, add the boxes under 7, then 6, then 4.',
        'Check with a slow sum.'], 'Why do you jump from 7 to 6 to 4?'),
      make() { return { a: Array.from({ length: 8 }, () => rnd(1, 9)), k: rnd(5, 8) }; },
      run(x, { a, k }) {
        const n = a.length, low = (i) => i & -i, T = Array(n + 1).fill(null);
        const view = (marks, qlist) => ({ ...rows([row('numbers', a, {}, Object.fromEntries(a.map((_, i) => [i, String(i + 1)]))), row('T (cell 1 to 8)', T.slice(1).map((t) => (t === null ? '' : t)), marks || {}, Object.fromEntries(Array.from({ length: n }, (_, i) => [i, `cover ${low(i + 1)}`])))]), lists: qlist || [] });
        x.rec(view(), -1, `Build the tree, then add up the first ${k} numbers. Under each cell, "cover" is how many numbers it adds. Press play.`);
        for (let i = 1; i <= n; i++) {
          T[i] = a.slice(i - low(i), i).reduce((p, q) => p + q, 0);
          x.rec(view({ [i - 1]: 'cur' }), 0, `Cell ${i} covers the last ${low(i)} number${low(i) === 1 ? '' : 's'}: ${a.slice(i - low(i), i).join(' + ')} = ${T[i]}.`);
        }
        let i = k, total = 0, asked = 0; const used = {};
        x.rec(view(), 1, `Prefix sum of the first ${k}: start at cell ${k}.`);
        while (i > 0) {
          total += T[i]; used[i - 1] = 'found';
          const nxt = i - low(i);
          x.rec(view({ ...used }, [{ label: 'Total', items: [total] }]), 3, `Add cell ${i} (${T[i]}). Total ${total}.`, i > 1 && asked < 2 ? (asked++, numq(`The next cell is ${i} minus its lowest set bit (${low(i)}). Which is it?`, nxt, [i - 1, Math.max(0, i - 2), nxt + 1], `${i} − ${low(i)} = ${nxt}.`)) : null);
          i = nxt;
        }
        x.rec(view({ ...used }, [{ label: 'Total', items: [total] }]), 4, `The sum of the first ${k} numbers is ${total}, using only ${Object.keys(used).length} cell${Object.keys(used).length === 1 ? '' : 's'}.`);
        x.result = { sum: total, k, T: T.slice(1) };
      },
    },

    sparse: {
      name: 'Sparse tables',
      blurb: 'A sparse table pre-computes the smallest number in every block whose length is a power of 2. Any stretch is then covered by two overlapping blocks, so each question takes one look-up.',
      facts: [['Build', 'O(n log n)'], ['Query', 'O(1)'], ['Works for', 'Min, max, gcd']],
      code: ['level 0: the numbers themselves', 'level k: min of two blocks of level k−1', 'query(l, r): k ← biggest power of 2 that fits', 'answer ← min(block at l, block ending at r)'],
      offline: off('Overlapping blocks', 'Paper and 8 numbers', '15 minutes', [
        'Write 8 numbers. Underneath, write the smaller of each neighbouring pair. Underneath that, the smallest of each 4 in a row.',
        'To find the smallest in a stretch of 6, pick the biggest block that fits (4). Use one block at the start and one ending at the end. They overlap.',
        'The smaller of those two block values is the answer.'], 'Why does the overlap not matter for "smallest"? Would it matter for "sum"?'),
      make() { const l = rnd(0, 3), r = rnd(l + 2, 7); return { a: Array.from({ length: 8 }, () => rnd(1, 40)), l, r }; },
      run(x, { a, l, r }) {
        const n = a.length, st = [a.slice()];
        const view = (upto, marks) => rows(st.slice(0, upto).map((lv, k) => row(`blocks of ${2 ** k}`, lv, (marks && marks[k]) || {})));
        x.rec(view(1), -1, `Pre-compute the smallest of every power-of-2 block. Press play.`);
        for (let k = 1; 2 ** k <= n; k++) {
          const prev = st[k - 1], cur = [];
          for (let i = 0; i + 2 ** k <= n; i++) cur.push(Math.min(prev[i], prev[i + 2 ** (k - 1)]));
          st.push(cur);
          x.rec(view(k + 1), 1, `Each cell is the smaller of two cells above it: the smallest in a block of ${2 ** k}.`);
        }
        const len = r - l + 1, k = Math.floor(Math.log2(len)), b1 = st[k][l], b2 = st[k][r - 2 ** k + 1];
        x.rec(view(st.length), 2, `Query: the smallest in positions ${l} to ${r}. That is ${len} numbers.`,
          numq(`The biggest power of 2 that fits in ${len} numbers?`, 2 ** k, [2 ** (k + 1), 2 ** Math.max(0, k - 1), len], `${2 ** k} ≤ ${len} < ${2 ** (k + 1)}.`));
        x.rec(view(st.length, { [k]: { [l]: 'cur', [r - 2 ** k + 1]: 'alt' } }), 3, `Block starting at ${l}: ${b1}. Block ending at ${r}: ${b2}. They overlap, which is fine for "smallest".`);
        x.rec(view(st.length, { [k]: { [l]: 'found', [r - 2 ** k + 1]: 'found' } }), 3, `The smaller is ${Math.min(b1, b2)}. One look-up each.`);
        x.result = { min: Math.min(b1, b2), l, r };
      },
    },
  };

  VLLab.define('trees', ALGOS);
})();
