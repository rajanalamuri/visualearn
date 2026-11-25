/* VisuaLearn trees lessons: traversals, lowest common ancestor, heaps, heap sort, tries, AVL trees,
   segment trees, Fenwick trees and sparse tables. */
(() => {
  'use strict';
  const { rnd, pick, distinct, shuffle, row, rows, choice, numq, yesno, plural, treePos } = VLLab;
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
          x.rec(view(), 3, `Same depth, different nodes. Lift both: A to ${p}, B to ${q}.`, asked < 4 ? (asked++, yesno(`A is now at ${p} and B is at ${q}. Are they on the same node yet?`, p === q, p === q ? 'Yes: this is where their paths meet.' : 'No, so keep lifting both.')) : null);
        }
        x.rec({ ...view(), nodes: view().nodes.map((n) => ({ ...n, c: n.id === p ? 'found' : n.c })) }, 4, `They meet at ${p}. That is the lowest common ancestor.`);
        x.result = p;
      },
    },

    heap: {
      name: 'Heaps and priority queues',
      blurb: 'A heap keeps the smallest number on top. A new number goes in at the bottom and swaps up while it is smaller than its parent. To take the smallest, remove the top and sink the last number down.',
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
      blurb: 'Turn the row into a heap with the biggest on top. Swap the top with the last place: that number is finished. Fix the heap and repeat until every number is finished.',
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
      blurb: 'A search tree is fast only if it stays bushy. Adding numbers in order makes a lopsided stick. An AVL tree checks each node, and when one side gets two levels taller than the other, it rotates to fix it.',
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
      blurb: 'A segment tree keeps the sum of every chunk of a row: the whole row on top, halves below, single numbers at the bottom. Any stretch can be added up by combining just a few chunks.',
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
      blurb: 'A Fenwick tree stores running totals in a clever way. Each cell adds up a block of numbers that ends there. A total of the first few numbers needs only a few cells.',
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
      blurb: 'A sparse table writes down the smallest number in every block that is 1, 2, 4 or 8 long. Any stretch is covered by two blocks that overlap, so each question takes one look.',
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

  ALGOS.btree = {
    name: 'B-trees',
    blurb: 'A B-tree keeps several numbers in each node, so the tree is short and wide. Databases love that. When a node gets too full it splits, and the middle number moves up.',
    facts: [['Keys per node', 'Up to 2 here'], ['All leaves', 'Same depth'], ['Used for', 'Databases, file systems']],
    code: ['walk down to the leaf where the number belongs', 'put the number in that leaf, in order', 'if the node now holds 3 numbers: split it', '  the middle number moves up to the parent', 'if the root splits, the tree grows taller'],
    offline: off('Boxes of numbers', 'Paper, a pencil and 7 numbers', '15 minutes', [
      'Draw a box that can hold at most 2 numbers. Add numbers in order into the right place.',
      'When a box would hold 3, split it: the middle number goes up into a new box above, and the other two become its children.',
      'Keep adding. Every time a box fills to 3, split it.',
      'Check: are all the bottom boxes on the same level?'], 'Why does a B-tree never get lopsided the way a plain search tree can?'),
    make() { return { v: distinct(7, 10, 99) }; },
    run(x, { v }) {
      let root = { keys: [], kids: [] }, splits = 0, last = null;
      const ins = (n, k) => {
        if (!n.kids.length) { n.keys.push(k); n.keys.sort((a, b) => a - b); last = n; } else {
          let i = n.keys.findIndex((z) => k < z); if (i < 0) i = n.keys.length;
          const r = ins(n.kids[i], k);
          if (r) { n.keys.splice(i, 0, r.up); n.kids.splice(i, 1, r.l, r.r); }
        }
        if (n.keys.length > 2) { splits++; return { up: n.keys[1], l: { keys: [n.keys[0]], kids: n.kids.slice(0, 2) }, r: { keys: [n.keys[2]], kids: n.kids.slice(2) } }; }
        return null;
      };
      const view = (hl) => {
        let leaf = 0, maxD = 0; const nodes = [], edges = [];
        (function pos(n, d) { maxD = Math.max(maxD, d); n.kids.forEach((k) => pos(k, d + 1)); n.x = n.kids.length ? n.kids.reduce((s, k) => s + k.x, 0) / n.kids.length : leaf++; n.d = d; })(root, 0);
        let id = 0; const cols = Math.max(leaf, 1);
        (function emit(n, pid) { const me = id++; nodes.push({ id: me, x: 40 + (cols === 1 ? 260 : (n.x * 520) / (cols - 1)), y: 36 + n.d * 62, t: n.keys.join('  '), wide: true, c: n === hl ? 'cur' : '' }); if (pid !== null) edges.push({ a: pid, b: me }); n.kids.forEach((k) => emit(k, me)); })(root, null);
        return { type: 'graph', h: 80 + maxD * 62, nodes, edges, lists: [{ label: 'Splits so far', items: [splits] }] };
      };
      x.rec({ type: 'rows', rows: [row('numbers to add', v, {})], lists: [] }, -1, `Add ${v.length} numbers to a B-tree where a node holds at most 2. Press play.`);
      let asked = 0;
      v.forEach((k) => {
        const before = splits, r = ins(root, k);
        let grew = false;
        if (r) { root = { keys: [r.up], kids: [r.l, r.r] }; grew = true; }
        const sp = splits - before;
        x.rec(view(sp ? null : last), sp ? 2 : 0, sp ? `Add ${k}: a node reached 3 numbers, so it split${grew ? ' and the tree grew taller' : ''}. The middle number moved up.` : `Add ${k} to the leaf where it belongs.`,
          asked < 3 && root.keys.length + (root.kids.length ? 0 : 0) >= 0 && sp ? (asked++, yesno(`Adding ${k} made a node hold 3 numbers. Did it split?`, true, 'A node holds at most 2 numbers, so a third forces a split.')) : null);
      });
      const inorder = (function io(n) { const o = []; n.keys.forEach((z, i) => { if (n.kids[i]) o.push(...io(n.kids[i])); o.push(z); }); if (n.kids.length) o.push(...io(n.kids[n.keys.length])); return o; })(root);
      const depths = []; (function dd(n, d) { if (!n.kids.length) depths.push(d); else n.kids.forEach((k) => dd(k, d + 1)); })(root, 0);
      x.rec(view(null), 4, `All ${v.length} numbers are stored. Every bottom node is at the same depth (${depths[0]}).`);
      x.result = { inorder, depths, maxKeys: (function mk2(n) { return Math.max(n.keys.length, ...n.kids.map(mk2), 0); })(root) };
    },
  };

  ALGOS.skiplist = {
    name: 'Skip lists',
    blurb: 'A skip list is a sorted list with express lanes. The top lane leaps far. Go right while the next number is not too big, then drop down a lane. It searches fast, like a tree, but it is only lists.',
    facts: [['Search', 'About log n steps'], ['Built from', 'Sorted lanes'], ['Uses', 'Chance to choose lanes']],
    code: ['start at the top lane, left end', 'if the next number on this lane is not past the target: move right', 'otherwise: drop down one lane', 'on the bottom lane: stop at the target, or it is missing'],
    offline: off('Express lanes', 'Paper: a bottom row of 8 sorted numbers, and shorter rows above', '15 minutes', [
      'Write 8 sorted numbers on the bottom row. Copy about half of them to a row above, and about half of those to a row above that.',
      'Pick a target. Start at the left of the top row and move right while the next number is not bigger than the target.',
      'Drop down a row and keep moving right. Stop at the bottom row.',
      'Count your moves, and compare with moving along the bottom row only.'], 'Why does the top lane help most when the target is far to the right?'),
    make() {
      const keys = distinct(8, 1, 60).sort((a, b) => a - b), lv = keys.map(() => 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0));
      lv[rnd(0, 7)] = 3;
      return { keys, lv, t: Math.random() < 0.8 ? keys[rnd(0, 7)] : rnd(1, 60) };
    },
    run(x, { keys, lv, t }) {
      const n = keys.length, H = 3, name = (h) => `lane ${h}`;
      const view = (h, pos, done) => rows(Array.from({ length: H }, (_, k) => { const lane = H - k; return row(name(lane), keys.map((key, i) => (lv[i] >= lane ? key : '')), Object.fromEntries(keys.map((_, i) => [i, lv[i] >= lane && i === pos && lane === h ? (done ? 'found' : 'cur') : ''])), pos >= 0 && lane === h ? { [pos]: 'here' } : {}); }));
      x.rec(view(H, -1), -1, `Find ${t}. The top lane has only a few numbers. Press play.`, null, [['Moves', 0]]);
      let h = H, pos = -1, moves = 0, asked = 0, found = false;
      const nextOn = (lane, p) => { for (let i = p + 1; i < n; i++) if (lv[i] >= lane) return i; return -1; };
      while (h >= 1) {
        const nx = nextOn(h, pos);
        if (nx >= 0 && keys[nx] <= t) {
          const q = asked < 3 ? (asked++, choice(`On ${name(h)}, the next number is ${keys[nx]} and the target is ${t}. What now?`, 'Move right', ['Drop down a lane'], `${keys[nx]} is not past ${t}, so moving right is safe.`)) : null;
          pos = nx; moves++;
          x.rec(view(h, pos), 1, `${keys[nx]} is not past ${t}: move right to ${keys[nx]}.`, q, [['Moves', moves]]);
          if (keys[nx] === t) { found = true; x.rec(view(h, pos, true), 3, `Found ${t} in ${moves} moves.`, null, [['Moves', moves]]); break; }
        } else {
          const q = asked < 3 && nx >= 0 ? (asked++, choice(`On ${name(h)}, the next number is ${keys[nx]} and the target is ${t}. What now?`, 'Drop down a lane', ['Move right'], `${keys[nx]} is past ${t}, so going right would overshoot. Drop down for finer steps.`)) : null;
          moves++;
          x.rec(view(h - 1 || 1, pos), 2, nx >= 0 ? `The next number, ${keys[nx]}, is past ${t}. Drop down to lane ${Math.max(h - 1, 1)}.` : `The end of ${name(h)}. Drop down.`, q, [['Moves', moves]]);
          h--;
        }
      }
      if (!found) x.rec(view(1, pos), 3, `${t} is not in the list. ${moves} moves.`, null, [['Moves', moves]]);
      x.result = { found, moves, t, keys };
    },
  };

  ALGOS.treedp = {
    name: 'Tree DP',
    blurb: 'Pick nodes in a tree to get the most total value, but never two nodes that are joined. For each node work out the best total if you take it and if you skip it, using what its children already found.',
    facts: [['Order', 'Children first'], ['Per node', 'Take or skip'], ['Time', 'O(nodes)']],
    code: ['for each node, children first', '  take it: its value + each child\'s skip total', '  skip it: each child\'s better of take and skip', 'the answer is the bigger of the root\'s two totals'],
    offline: off('Pick without neighbours', 'A tree of 7 circles on paper, each with a value', '15 minutes', [
      'Draw a tree and write a value in each circle.',
      'Work from the bottom up. Beside each circle write two numbers: best if I take it, best if I skip it.',
      'Take = its value + the skip numbers of its children. Skip = the bigger of each child\'s two numbers, added up.',
      'The bigger of the top circle\'s two numbers is your answer.'], 'Why can a child\'s answer be reused, instead of being worked out again?'),
    make() { const v = distinct(7, 1, 80); return { v, w: Object.fromEntries(v.map((k) => [k, rnd(1, 9)])) }; },
    run(x, { v, w }) {
      const root = bstFrom(v), dp = new Map(); let asked = 0;
      const show = (marks) => {
        const subs = {}; dp.forEach((val, k) => { subs[k] = `${val[0]}/${val[1]}`; });
        const view = treeView(root, marks || {}, subs); view.nodes.forEach((nd) => { nd.t = `w${w[nd.id]}`; }); return view;
      };
      x.rec(show(), -1, 'Pick nodes for the biggest total weight (w), but never two joined nodes. Under each node: best if taken / best if skipped. Press play.');
      (function go(n) {
        if (!n) return [0, 0];
        const a = go(n.l), b = go(n.r);
        const take = w[n.v] + a[1] + b[1], skip = Math.max(...a) + Math.max(...b);
        dp.set(n.v, [take, skip]);
        x.rec(show({ [n.v]: 'cur' }), 1, `Node w${w[n.v]}: take = ${w[n.v]} + ${a[1]} + ${b[1]} = ${take}. Skip = ${Math.max(...a)} + ${Math.max(...b)} = ${skip}.`,
          asked < 3 && (n.l || n.r) ? (asked++, numq(`If we take this node (w${w[n.v]}), its children must be skipped: their skip totals are ${a[1]} and ${b[1]}. What is the total?`, take, [skip, take + 1, w[n.v]], `${w[n.v]} + ${a[1]} + ${b[1]} = ${take}.`)) : null);
        return [take, skip];
      })(root);
      const best = Math.max(...dp.get(root.v));
      x.rec(show({ [root.v]: 'found' }), 3, `The best total is ${best}.`);
      x.result = { best, v, w };
    },
  };

  ALGOS.treap = {
    name: 'Treaps',
    blurb: 'A treap is a search tree with a random priority on every node. Keys keep the order left to right. Priorities keep the biggest at the top. The randomness keeps the tree bushy, even when the keys arrive in order.',
    facts: [['Order by', 'Key (left < right)'], ['Heap by', 'Random priority'], ['Height', 'About log n, by luck']],
    code: ['add the node like a normal search tree, by key', 'give it a random priority (p)', 'while its priority is higher than its parent\'s:', '  rotate it above its parent', 'search order and priority order both hold'],
    offline: off('Keys and dice', 'Paper, a pencil, a dice or number cards for priorities, and 7 numbers in order', '20 minutes', [
      'Write 7 numbers in increasing order. Give each a random priority (draw numbers from a hat).',
      'Add them to a search tree one at a time by key. A plain tree would be a stick.',
      'After adding a node, if its priority is bigger than its parent\'s, swap their places by rotating, and repeat.',
      'Compare the height of your tree with a stick of 7.'], 'Why does random priority make the tree behave as if the keys had arrived in random order?'),
    make() { return { keys: distinct(7, 1, 90).sort((a, b) => a - b), pri: distinct(7, 1, 99) }; },
    run(x, { keys, pri }) {
      let root = null, asked = 0, rot = 0;
      const prOf = {}; keys.forEach((k, i) => { prOf[k] = pri[i]; });
      const view = (marks) => treeView(root, marks || {}, Object.fromEntries(keys.map((k) => [k, `p${prOf[k]}`])));
      x.rec({ type: 'rows', rows: [row('keys in order', keys, {}), row('random priority', pri, {})], lists: [] }, -1, 'Add the keys in order. Each has a random priority (p). The highest priority belongs at the top. Press play.');
      keys.forEach((k, i) => {
        const n = { v: k, p: pri[i], l: null, r: null }, path = [];
        if (!root) root = n; else { let c = root; for (;;) { path.push(c); const s = k < c.v ? 'l' : 'r'; if (!c[s]) { c[s] = n; break; } c = c[s]; } }
        x.rec(view({ [k]: 'cur' }), 0, `Add ${k} with priority ${pri[i]}, like a normal search tree.`);
        while (path.length) {
          const par = path[path.length - 1], up = n.p > par.p;
          x.rec(view({ [k]: 'cur', [par.v]: 'alt' }), 2, `${k} has priority ${n.p}; its parent ${par.v} has ${par.p}.`, asked < 3 ? (asked++, yesno(`Is ${n.p} bigger than the parent's ${par.p}, so ${k} should rotate above it?`, up, up ? 'A higher priority must sit above a lower one.' : 'The parent already has the higher priority, so the order is fine.')) : null);
          if (!up) break;
          if (par.l === n) { par.l = n.r; n.r = par; } else { par.r = n.l; n.l = par; }
          const gp = path[path.length - 2];
          if (!gp) root = n; else if (gp.l === par) gp.l = n; else gp.r = n;
          path.pop(); rot++;
          x.rec(view({ [k]: 'found' }), 3, `Rotate: ${k} moves above ${par.v}.`);
        }
      });
      const pairs = [], inorder = []; let height = 0;
      (function w(n, d) { if (!n) return; height = Math.max(height, d); w(n.l, d + 1); inorder.push(n.v); w(n.r, d + 1); [n.l, n.r].forEach((c) => { if (c) pairs.push([n.p, c.p]); }); })(root, 1);
      x.rec(view(), 4, `Height ${height}, after ${rot} rotation${rot === 1 ? '' : 's'}. A plain tree from these keys would be ${keys.length} tall.`);
      x.result = { inorder, pairs, height, rot };
    },
  };

  ALGOS.hld = {
    name: 'Heavy-light decomposition',
    blurb: 'Split a tree into long chains by always going down to the child with the biggest subtree. Any path then crosses only a few chains, because each time you leave a chain the tree at least doubles.',
    facts: [['Heavy child', 'Biggest subtree'], ['Chains crossed', 'At most about log n'], ['Used for', 'Fast path queries']],
    code: ['size[node] ← 1 + the sizes of its children', 'heavy child ← the child with the biggest size', 'a heavy child continues its parent\'s chain', 'every other child starts a new chain', 'path query: while the chains differ, jump the deeper chain\'s head to its parent'],
    offline: off('Chains in a tree', 'A tree of 9 circles on paper and coloured pencils', '20 minutes', [
      'Draw a tree of 9 circles. Write beside each circle the size of the tree hanging below it (itself included).',
      'From each circle, draw a thick line to the child with the larger size. Thin lines go to the others.',
      'Colour each chain of thick lines in one colour. Every circle belongs to exactly one chain.',
      'Pick two circles. Count how many times a path between them switches colour.'], 'Why does the subtree at least double each time you take a thin line upward?'),
    make() { const v = distinct(10, 1, 90), t = shuffle(v); return { v, a: t[0], b: t[1] }; },
    run(x, { v, a, b }) {
      const root = bstFrom(v), par = new Map(), dep = new Map(), size = new Map(), heavy = new Map(), head = new Map();
      (function d(n, p, k) { if (!n) return; par.set(n.v, p); dep.set(n.v, k); d(n.l, n.v, k + 1); d(n.r, n.v, k + 1); })(root, null, 0);
      const cls = ['key', 'found', 'alt', 'done', 'swap', 'seen'], chainOf = new Map(); let nc = 0;
      const subs = {}, showSizes = new Set(), showChains = { on: false }, hv = { on: false };
      const view = (marks, lists) => {
        const vw = treeView(root, marks || {}, subs, { lists });
        if (hv.on) vw.edges.forEach((e) => { e.c = heavy.get(e.a) === e.b ? 'path' : 'cut'; });
        return vw;
      };
      x.rec(view(), -1, 'Cut the tree into chains. First find the size of the subtree under each node: the small number under a node is its size. Press play.');
      let asked = 0;
      (function sz(n) {
        if (!n) return 0;
        const l = sz(n.l), r = sz(n.r); size.set(n.v, 1 + l + r); subs[n.v] = String(1 + l + r);
        x.rec(view({ [n.v]: 'cur' }), 0, `Node ${n.v}: 1 + ${l} + ${r} = ${1 + l + r} nodes in its subtree.`, asked < 2 && (n.l || n.r) ? (asked++, numq(`The subtrees under ${n.v}'s children have ${l} and ${r} nodes. How many nodes are under ${n.v}, itself included?`, 1 + l + r, [l + r, 2 + l + r, Math.max(l, r)], `1 + ${l} + ${r} = ${1 + l + r}.`)) : null);
        return 1 + l + r;
      })(root);
      (function hy(n) { if (!n) return; const lc = n.l ? size.get(n.l.v) : 0, rc = n.r ? size.get(n.r.v) : 0; if (n.l || n.r) heavy.set(n.v, lc >= rc ? n.l.v : n.r.v); hy(n.l); hy(n.r); })(root);
      hv.on = true;
      x.rec(view(), 1, 'Heavy edges (green) go to the child with the bigger subtree. Light edges (dashed) go to the other.');
      (function ch(n, h) { if (!n) return; head.set(n.v, h); if (h === n.v) chainOf.set(h, nc++); [n.l, n.r].forEach((c) => { if (c) ch(c, heavy.get(n.v) === c.v ? h : c.v); }); })(root, root.v);
      const chains = [...head.keys()].filter((k) => head.get(k) === k).map((h) => { const c = [h]; while (heavy.has(c[c.length - 1])) c.push(heavy.get(c[c.length - 1])); return c; });
      const colour = Object.fromEntries([...head.entries()].map(([k, h]) => [k, cls[chainOf.get(h) % cls.length]]));
      x.rec(view(colour, [{ label: 'Chains (top to bottom)', items: chains.map((c) => c.join('→')) }]), 2, `Following heavy edges down gives ${chains.length} chains. Each colour is one chain.`);
      let p = a, q = b, jumps = 0;
      x.rec(view({ ...colour, [p]: 'cur', [q]: 'cur' }, [{ label: 'Chains crossed', items: [0] }]), 4, `Find the path between ${a} and ${b}. Move the one whose chain head is deeper, up to the parent of that head.`);
      while (head.get(p) !== head.get(q)) {
        const moveP = dep.get(head.get(p)) > dep.get(head.get(q)), h = moveP ? head.get(p) : head.get(q);
        const qn = asked < 4 ? (asked++, choice('The two nodes are on different chains. Which one jumps?', moveP ? `The one at ${p}` : `The one at ${q}`, [moveP ? `The one at ${q}` : `The one at ${p}`], 'The node whose chain head is deeper jumps up first, so we never overshoot.')) : null;
        if (moveP) p = par.get(h); else q = par.get(h);
        jumps++;
        x.rec(view({ ...colour, [p]: 'cur', [q]: 'cur' }, [{ label: 'Chains crossed', items: [jumps] }]), 4, `Jump from the head of the chain (${h}) to its parent ${moveP ? p : q}. Chains crossed: ${jumps}.`, qn);
      }
      const lca = dep.get(p) <= dep.get(q) ? p : q;
      x.rec(view({ ...colour, [lca]: 'found' }, [{ label: 'Chains crossed', items: [jumps] }]), 4, `Same chain now. The paths meet at ${lca}. Only ${jumps} jump${jumps === 1 ? '' : 's'} were needed.`);
      x.result = { chains, jumps, a, b, lca };
    },
  };

  VLLab.define('trees', ALGOS);
})();
