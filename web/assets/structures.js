/* VisuaLearn data-structures lesson: arrays (slots), hash tables (shelves) and binary search trees.
   Every step is recorded up front as a frame, so the shared player can step back and ask questions first. */
(() => {
  'use strict';

  const CAP = 8;      // slots in the array
  const SHELVES = 7;  // buckets in the hash table
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const s = (k, w = '') => (k === 1 ? '' : w || 's');

  // Up to four distinct whole-number options, sorted, with the right one marked.
  function numOpts(correct, extras) {
    const rest = [...new Set(extras)].filter((v) => v !== correct && v >= 0).slice(0, 3);
    const all = [correct, ...rest].sort((a, b) => a - b);
    return { options: all.map(String), answer: all.indexOf(correct) };
  }

  // ---------- arrays ----------
  function recordArray(inp) {
    const a = inp.a.slice(), n = a.length, pos = inp.pos, read = inp.read;
    const cells = a.concat(Array(CAP - n).fill(null));
    const frames = [];
    let c = 0;
    const rec = (cur, mv, line, note, q) => frames.push({ cells: cells.slice(), cur, mv, c, line, note, q: q || null });

    rec(-1, -1, -1, `A row of ${CAP} slots. ${n} are full and ${CAP - n} are empty. Press play.`);
    c = 1;
    rec(read, -1, 0, `Read slot ${read + 1}: jump straight there. One step, and it would still be one step in a row of a million.`, {
      text: `How many slots must we look at to read slot ${read + 1}?`,
      ...numOpts(1, [read + 1, n]),
      why: 'Slots are side by side in memory, so the computer can jump straight to any slot. It does not count along.',
    });
    c = 0;
    const must = n - pos;
    rec(-1, -1, 1, `Now squeeze ${inp.val} into slot ${pos + 1}. The numbers from slot ${pos + 1} onward have to shuffle right to make room.`, {
      text: `How many numbers must move over to make room at slot ${pos + 1}?`,
      ...numOpts(must, [must - 1, must + 1, pos, n]),
      why: `Every number from slot ${pos + 1} to slot ${n} moves one place right. That's ${must}.`,
    });
    for (let i = n - 1; i >= pos; i--) {
      cells[i + 1] = cells[i];
      cells[i] = null;
      c++;
      rec(i, i + 1, 2, `Move ${cells[i + 1]} from slot ${i + 1} to slot ${i + 2}. That's move number ${c}.`);
    }
    cells[pos] = inp.val;
    rec(-1, pos, 3, `Drop ${inp.val} into slot ${pos + 1}. It took ${c} move${s(c)}.`);
    rec(-1, -1, -1, `Reading was one step. Inserting near the front took ${c}. Arrays are brilliant for reading and slow for squeezing things in.`);
    return frames;
  }

  // ---------- hash tables ----------
  function recordHash(inp) {
    const keys = inp.keys, shelves = Array.from({ length: SHELVES }, () => []);
    const frames = [];
    let c = 0, count = 0;
    const rec = (cur, curB, line, note, q, hit) => frames.push({
      shelves: shelves.map((x) => x.slice()), cur, curB, hit: hit ?? -1, c, count, line, note, q: q || null,
    });

    rec(-1, -1, -1, `${SHELVES} shelves, numbered 0 to ${SHELVES - 1}. A number goes on shelf (number ÷ ${SHELVES}, remainder). Press play.`);
    keys.forEach((k, j) => {
      const b = k % SHELVES;
      const q = j === 1 || j === 3 || j === 5 ? {
        text: `${k} ÷ ${SHELVES} leaves what remainder? That is its shelf.`,
        ...numOpts(b, [(b + 1) % SHELVES, (b + 3) % SHELVES, (b + 5) % SHELVES]),
        why: `${k} = ${Math.floor(k / SHELVES)} × ${SHELVES} + ${b}, so the remainder is ${b}.`,
      } : null;
      rec(k, -1, 0, `${k} ÷ ${SHELVES} leaves ${b}. So ${k} belongs on shelf ${b}.`, q);
      const was = shelves[b].slice();
      shelves[b].push(k);
      count++;
      rec(k, b, 1, was.length
        ? `Shelf ${b} already holds ${was.join(', ')}. That's a collision, so ${k} joins the chain on the same shelf.`
        : `Shelf ${b} was empty, so ${k} sits there alone.`);
    });

    const t = inp.find, tb = t % SHELVES, chain = shelves[tb], at = chain.indexOf(t);
    rec(t, -1, 2, `Now find ${t}. Don't search everywhere: ${t} ÷ ${SHELVES} leaves ${tb}, so look only on shelf ${tb}.`, {
      text: `How many numbers do we have to check to find ${t}?`,
      ...numOpts(at + 1, [1, 2, 3, keys.length]),
      why: `Only shelf ${tb} matters. ${t} is number ${at + 1} on it, so we check ${at + 1}, not all ${keys.length}.`,
    });
    for (let j = 0; j <= at; j++) {
      c++;
      rec(chain[j], tb, 3, chain[j] === t ? `${chain[j]} is the one. Found after checking ${c} number${s(c)}.` : `${chain[j]} isn't ${t}, so check the next one on the shelf.`,
        null, chain[j] === t ? t : -1);
    }
    rec(-1, -1, -1, `Found with ${c} check${s(c)} out of ${keys.length} numbers. A good hash spreads numbers so each shelf stays short.`);
    return frames;
  }

  // ---------- binary search trees ----------
  function layout(keys) {
    const root = { v: keys[0], l: null, r: null, d: 0 };
    const parent = new Map();
    for (const k of keys.slice(1)) {
      let n = root;
      for (;;) {
        const side = k < n.v ? 'l' : 'r';
        if (!n[side]) { n[side] = { v: k, l: null, r: null, d: n.d + 1 }; parent.set(k, n.v); break; }
        n = n[side];
      }
    }
    const rank = new Map([...keys].sort((x, y) => x - y).map((v, i) => [v, i]));
    const depth = new Map();
    (function walk(n) { if (n) { depth.set(n.v, n.d); walk(n.l); walk(n.r); } })(root);
    return { parent, rank, depth, count: keys.length };
  }

  function recordBst(inp) {
    const keys = inp.keys, tree = layout(keys), frames = [];
    const left = new Map(), right = new Map();
    const placed = [];
    let c = 0, root = null;
    const rec = (cur, ins, line, note, q, found) => frames.push({
      placed: placed.slice(), cur, ins, found: found ?? -1, c, line, note, q: q || null,
    });
    const goQ = (v, n, ask) => (ask ? {
      text: `${v} against ${n}: which way do we go?`,
      options: ['Left (smaller)', 'Right (bigger)'], answer: v < n ? 0 : 1,
      why: v < n ? `${v} is smaller than ${n}, so it belongs somewhere on the left.` : `${v} is bigger than ${n}, so it belongs somewhere on the right.`,
    } : null);

    rec(-1, -1, -1, `A tree starts empty. Rule: smaller numbers go left, bigger numbers go right. Press play.`);
    keys.forEach((k, j) => {
      if (root === null) {
        root = k; placed.push(k);
        rec(-1, -1, 0, `${k} is the first number, so it becomes the root, the top of the tree.`);
        return;
      }
      let n = root, first = true;
      for (;;) {
        const goLeft = k < n;
        rec(n, k, 1, `Place ${k}. Compare with ${n}: ${goLeft ? `${k} is smaller, go left.` : `${k} is bigger, go right.`}`, goQ(k, n, first && (j === 2 || j === 4 || j === 6)));
        first = false;
        const next = (goLeft ? left : right).get(n);
        if (next === undefined) {
          (goLeft ? left : right).set(n, k); placed.push(k);
          rec(-1, -1, 2, `There's nothing on the ${goLeft ? 'left' : 'right'} of ${n}, so ${k} goes there.`);
          break;
        }
        n = next;
      }
    });

    const t = inp.target;
    rec(-1, -1, 3, `The tree has ${keys.length} numbers. Now find ${t}. Start at the root and use the same rule.`);
    let n = root, firstQ = true;
    for (;;) {
      c++;
      if (n === t) { rec(n, -1, 4, `${n} is the one! Found after ${c} comparison${s(c)}.`, null, n); break; }
      const goLeft = t < n;
      rec(n, -1, 5, `${t} against ${n}: ${goLeft ? 'smaller, so go left' : 'bigger, so go right'}.`, goQ(t, n, firstQ && c === 2));
      firstQ = false;
      n = (goLeft ? left : right).get(n);
    }
    rec(-1, -1, -1, `${c} comparison${s(c)} instead of up to ${keys.length}. Each step threw away a whole side of the tree.`, null, t);
    frames.layout = tree; // used by the page to place the circles
    return frames;
  }

  const ALGOS = {
    array: {
      name: 'Arrays',
      blurb: 'An array is a row of slots side by side, so the computer can jump straight to any slot. The price: squeezing a new number into the middle means shuffling its neighbours along.',
      facts: [['Read a slot', '1 step'], ['Insert in the middle', 'about n steps'], ['Memory', 'One block']],
      code: [
        'read slot i: jump straight to it',
        'to insert at slot i:',
        '  for each slot from the end back to i',
        '    move its number one slot right',
        'put the new number in slot i',
      ],
      offline: {
        title: 'The egg-box shuffle',
        need: 'An egg box (or 8 cups in a row), and 5 small objects',
        time: '10 minutes',
        steps: [
          'Put one object in each of the first five slots of the box. Number the slots 1 to 8.',
          'Ask a friend to name a slot. Point to it straight away. That is reading an array.',
          'Now squeeze a new object into slot 2. You must move the objects in slots 5, 4, 3 and 2 along, one at a time, starting at the end.',
          'Count your moves. Try inserting into slot 5 instead.',
        ],
        think: 'Why must you start moving from the far end and not from slot 2? What happens if you start at the front?',
      },
    },
    hash: {
      name: 'Hash tables',
      blurb: 'A hash table does not search at all. A tiny rule, here the remainder after dividing, tells you which shelf a number lives on. To find it later, use the same rule and look on just that shelf.',
      facts: [['Find a number', 'about 1 step'], ['Collisions', 'Share a shelf'], ['Needs order?', 'No']],
      code: [
        'shelf ← number mod 7',
        'put the number on that shelf',
        'to find: shelf ← number mod 7',
        'check only the numbers on that shelf',
      ],
      offline: {
        title: 'The seven-shelf shop',
        need: 'Paper, a pencil and 8 numbers between 10 and 99',
        time: '10 minutes',
        steps: [
          'Draw seven boxes in a row and write 0 to 6 above them. These are your shelves.',
          'Take a number. Divide it by 7 and write the remainder in your head. Write the number in that box.',
          'If the box already has numbers, write the new one beside them.',
          'When all eight are filed, ask a friend to pick one. Find it by checking only one box.',
        ],
        think: 'Two numbers landed on the same shelf. Is that a mistake, or just something the table has to cope with? What if all eight landed on one shelf?',
      },
    },
    bst: {
      name: 'Binary search trees',
      blurb: 'A search tree puts every number where you can find it by asking one question at a time: smaller or bigger? Each answer throws away a whole branch.',
      facts: [['Find a number', 'about log₂ n steps'], ['Rule', 'Small left, big right'], ['Worst case', 'A lopsided tree']],
      code: [
        'start at the root',
        'compare the new number with this one',
        'smaller: go left. bigger: go right',
        'an empty spot? put the number there',
        'to find: stop when the numbers match',
        'otherwise keep going left or right',
      ],
      offline: {
        title: 'The family tree of numbers',
        need: 'Paper, a pencil and 7 numbers',
        time: '15 minutes',
        steps: [
          'Write the first number at the top of the page. That is the root.',
          'For each next number, start at the root. If it is smaller, move down-left. If it is bigger, move down-right.',
          'When you reach an empty space, write the number there and draw a line to its parent.',
          'Pick a number and find it by starting at the top again. Count your steps.',
        ],
        think: 'What would the tree look like if you added the numbers already in order, 1, 2, 3, 4, 5, 6, 7? How would that change the search?',
      },
    },
  };

  function make(key) {
    if (key === 'array') {
      const a = [];
      while (a.length < 5) { const v = rnd(10, 99); if (!a.includes(v)) a.push(v); }
      let val = rnd(10, 99);
      while (a.includes(val)) val = rnd(10, 99);
      return { a, val, pos: rnd(0, 2), read: rnd(0, 4) };
    }
    const pool = [];
    const want = key === 'hash' ? 8 : 7;
    while (pool.length < want) { const v = rnd(10, 99); if (!pool.includes(v)) pool.push(v); }
    return key === 'hash' ? { keys: pool, find: pool[rnd(0, pool.length - 1)] } : { keys: pool, target: pool[rnd(0, pool.length - 1)] };
  }

  const record = (key, inp) => (key === 'array' ? recordArray(inp) : key === 'hash' ? recordHash(inp) : recordBst(inp));

  globalThis.VLStructures = { ALGOS, record, make, layout, CAP, SHELVES };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view');
  let inputs = {}, layoutNow = null, svgNS = 'http://www.w3.org/2000/svg';
  const fresh = () => { inputs = { array: make('array'), hash: make('hash'), bst: make('bst') }; };
  const esc = (t) => String(t).replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  function drawArray(f) {
    view.className = 'boxes small';
    view.innerHTML = f.cells.map((v, k) => {
      const cls = v === null ? 'box gap' : 'box open' + (k === f.mv ? ' found' : k === f.cur ? ' cur' : '');
      return `<div class="${cls}"><b>${v === null ? '' : v}</b><small>${k + 1}</small></div>`;
    }).join('');
    view.setAttribute('aria-label', 'Array: ' + f.cells.map((v, k) => `slot ${k + 1} ${v === null ? 'empty' : v}`).join(', '));
  }

  function drawHash(f) {
    view.className = 'shelves';
    view.innerHTML = f.shelves.map((items, b) => {
      const chips = items.map((v) => `<span class="chip${v === f.hit ? ' found' : v === f.cur ? ' cur' : ''}">${v}</span>`).join('');
      return `<div class="shelf${b === f.curB ? ' on' : ''}"><b>${b}</b><div class="chips">${chips}</div></div>`;
    }).join('') + (f.cur >= 0 && f.curB < 0 ? `<p class="pocket">In your hand: <span class="chip cur">${f.cur}</span></p>` : '');
    view.setAttribute('aria-label', 'Hash table: ' + f.shelves.map((it, b) => `shelf ${b} ${it.join(', ') || 'empty'}`).join('; '));
  }

  function drawTree(f) {
    const L = layoutNow, n = L.count, maxD = Math.max(...L.depth.values());
    const X = (v) => 30 + (n === 1 ? 270 : (L.rank.get(v) * 540) / (n - 1)), Y = (v) => 36 + L.depth.get(v) * 62;
    const H = 70 + maxD * 62, placed = new Set(f.placed);
    let out = `<svg class="tree" viewBox="0 0 600 ${H}" role="img" aria-label="Binary search tree">`;
    for (const v of f.placed) {
      const p = L.parent.get(v);
      if (p !== undefined && placed.has(p)) out += `<line class="t-edge" x1="${X(p)}" y1="${Y(p)}" x2="${X(v)}" y2="${Y(v)}"/>`;
    }
    for (const v of f.placed) {
      const cls = v === f.found ? 'found' : v === f.cur ? 'cur' : '';
      out += `<g class="t-node ${cls}"><circle cx="${X(v)}" cy="${Y(v)}" r="19"/><text x="${X(v)}" y="${Y(v) + 5}" text-anchor="middle">${v}</text></g>`;
    }
    view.className = 'treewrap';
    view.innerHTML = out + '</svg>' + (f.ins >= 0 ? `<p class="pocket">Placing: <span class="chip cur">${esc(f.ins)}</span></p>` : '');
    view.setAttribute('aria-label', 'Tree holding ' + f.placed.join(', '));
  }

  const lesson = {
    algos: ALGOS,
    record: (key) => {
      const fr = record(key, inputs[key]);
      if (key === 'bst') layoutNow = fr.layout;
      return fr;
    },
    render(f, key) { (key === 'array' ? drawArray : key === 'hash' ? drawHash : drawTree)(f); },
    stats(f, key) {
      return key === 'array' ? [['Moves', f.c]] : key === 'hash' ? [['Numbers filed', f.count], ['Checks', f.c]] : [['Comparisons', f.c]];
    },
  };

  fresh();
  const player = VLPlayer.mount(lesson);
  $('b-new').addEventListener('click', () => { fresh(); player.restart(); });
})();
