/* VisuaLearn Play: a touch-first puzzle app. Four short games, five puzzles each, then it stops.
   No scores, no streaks, no timers: wrong answers are shown, never punished.
   Puzzle generation is pure and tested; everything after the "page" line draws it. */
(() => {
  'use strict';

  // ---------- puzzles (pure) ----------
  const SET = 5;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Fill the ten-frame: some cookies are already in. How many more make ten?
  const tenSet = () => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, SET).map((a) => ({ a, need: 10 - a }));

  // a + x = b. Pick the x that balances the scale. Gets bigger as the set goes on.
  function balanceSet() {
    return Array.from({ length: SET }, (_, i) => {
      const top = i < 2 ? 10 : i < 4 ? 15 : 20;
      const x = rnd(1, Math.min(9, top - 1));
      const a = rnd(1, Math.min(9, top - x));
      const options = new Set([x]);
      while (options.size < 3) { const v = x + rnd(1, 3) * (Math.random() < 0.5 ? -1 : 1); if (v >= 1) options.add(v); }
      return { a, x, b: a + x, flip: Math.random() < 0.5, options: shuffle([...options]) };
    });
  }

  // Deal n cookies fairly to k critters. First two puzzles divide exactly; later ones leave some for Pip.
  const shareSet = () => Array.from({ length: SET }, (_, i) => {
    const k = [2, 3, 3, 4, 4][i], q = rnd(2, 4), r = i < 2 ? 0 : rnd(1, k - 1);
    return { k, q, r, n: k * q + r };
  });
  const shareSolved = (counts, pile) => pile === 0 && counts.every((c) => c === counts[0]);

  // Find the hidden number. Each guess says higher or lower. Halving always needs par guesses or fewer.
  const GUESS_MAX = [10, 16, 32, 64, 100];
  const guessSet = () => GUESS_MAX.map((max) => ({ max, target: rnd(1, max), par: Math.floor(Math.log2(max)) + 1 }));
  function narrow(lo, hi, guess, target) {
    if (guess === target) return { hit: true, lo, hi };
    return guess < target ? { hit: false, lo: Math.max(lo, guess + 1), hi } : { hit: false, lo, hi: Math.min(hi, guess - 1) };
  }

  // A line (queue) serves the one who has waited longest; a pile (stack) gives back the one put on last.
  // Items are colours 0 to 4. ops are { t: 'in', c } or { t: 'out' }. Who is next out after they all happen?
  function runContainer(mode, start, ops) {
    const list = start.slice(), out = [];
    for (const op of ops) {
      if (op.t === 'in') list.push(op.c);
      else out.push(mode === 'queue' ? list.shift() : list.pop());
    }
    return { final: list, out, answer: mode === 'queue' ? list[0] : list[list.length - 1] };
  }
  function containerSet(mode) {
    return Array.from({ length: SET }, (_, i) => {
      for (;;) {
        const col = shuffle([0, 1, 2, 3, 4]), start = col.slice(0, 3), spare = col.slice(3), m = 2 + (i >> 1), ops = [];
        let size = 3;
        for (let k = 0; k < m; k++) {
          const canIn = spare.length > 0, canOut = size > 1;
          if (canIn && (!canOut || Math.random() < 0.5)) { ops.push({ t: 'in', c: spare.shift() }); size++; }
          else if (canOut) { ops.push({ t: 'out' }); size--; }
        }
        if (ops.length === m && size >= 2 && ops.some((o) => o.t === 'in') && ops.some((o) => o.t === 'out')) {
          const r = runContainer(mode, start, ops);
          return { mode, start, ops, answer: r.answer, final: r.final };
        }
      }
    });
  }

  // Tower of Hanoi: move every disc to the last peg, never a bigger disc on a smaller one.
  // The solution is recursive: move the smaller tower out of the way, move the big disc, move the tower back on top.
  const hanoiMoves = (n, from = 0, to = 2, via = 1) => (n === 0 ? [] : [...hanoiMoves(n - 1, from, via, to), [from, to], ...hanoiMoves(n - 1, via, to, from)]);
  const hanoiStart = (n) => [Array.from({ length: n }, (_, k) => n - k), [], []]; // discs by size, bottom first
  function hanoiLegal(pegs, from, to) {
    const a = pegs[from], b = pegs[to];
    return from !== to && a.length > 0 && (b.length === 0 || a[a.length - 1] < b[b.length - 1]);
  }
  const hanoiSolved = (pegs, n) => pegs[2].length === n;
  const towersSet = () => [2, 3, 3, 4, 4].map((n) => ({ n }));

  const OFFLINE = {
    ten: 'Press 10 coins into an egg box. Start with some in. How many more fill it?',
    balance: 'Hide coins under a cup. Say "the cup plus 3 makes 8". Can a friend find the cup?',
    share: 'Deal 14 cards to 3 people, one each, round and round. Who gets the leftovers?',
    guess: 'Think of a number from 1 to 100. Ask a friend to guess it. Only say higher or lower.',
    line: 'Line up toys like a queue. Serve the first one. Add one at the back. Who is next now?',
    pile: 'Stack four books. You can only take from the top. Which one comes out first? Which last?',
    towers: 'Stack three coins, small on top of big, on a plate. Move them to another plate, one at a time, never big on small.',
  };

  globalThis.VLPlay = { SET, tenSet, balanceSet, shareSet, shareSolved, guessSet, narrow, runContainer, containerSet, hanoiMoves, hanoiStart, hanoiLegal, hanoiSolved, towersSet, OFFLINE };

  // ---------- page ----------
  if (typeof document === 'undefined' || !globalThis.Pip) return;
  const { el, tween, wait, ease } = Pip;
  const $ = (id) => document.getElementById(id);
  const svg = $('stage'), tray = $('tray'), dotsEl = $('dots');
  const views = { launcher: $('launcher'), game: $('game'), done: $('done') };
  const app = { game: null, i: 0, set: [], token: 0, busy: false, pip: null };
  globalThis.VLPlay._app = app; // for tests and debugging

  const put = (n, x, y, s) => { n._x = x; n._y = y; if (s !== undefined) n._s = s; n.setAttribute('transform', `translate(${x} ${y}) scale(${n._s ?? 1})`); };
  async function fly(n, x1, y1, ms = 340, h = 40) {
    const x0 = n._x, y0 = n._y;
    await tween(ms, (t) => { const e = ease(t); put(n, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - 4 * h * t * (1 - t)); });
    put(n, x1, y1);
  }
  function cookie(parent, x, y, kind, r) {
    const g = el('g', { class: `ck ck-${kind}` }, parent);
    el('circle', { r }, g);
    for (const [cx, cy] of [[-5, -4], [5, -1], [-1, 6], [6, 7]]) el('circle', { cx: cx * r / 15, cy: cy * r / 15, r: r / 6.5, class: 'chip' }, g);
    put(g, x, y);
    return g;
  }
  function critter(x, y, k) {
    const g = el('g', { class: `critter cr-${k % 5}` }, svg);
    el('circle', { cx: 0, cy: -34, r: 62, fill: 'transparent' }, g); // a roomy tap target
    el('path', { d: `M 0 -58 Q ${k % 2 ? 10 : -10} -72 ${k % 2 ? 4 : -4} -80`, class: 'antenna' }, g);
    el('circle', { cx: k % 2 ? 4 : -4, cy: -82, r: 5, class: 'cr-body' }, g);
    el('circle', { cx: 0, cy: -30, r: 30, class: 'cr-body' }, g);
    if (k % 2) for (const ex of [-10, 10]) { el('circle', { cx: ex, cy: -36, r: 7, class: 'pip-eye' }, g); el('circle', { cx: ex, cy: -37, r: 3.2, class: 'pip-pupil' }, g); }
    else { el('circle', { cx: 0, cy: -36, r: 12, class: 'pip-eye' }, g); el('circle', { cx: 0, cy: -38, r: 5, class: 'pip-pupil' }, g); }
    el('path', { d: 'M -8 -16 Q 0 -8 8 -16', class: 'pip-mouth' }, g);
    put(g, x, y);
    return g;
  }
  function bubble(x, y, text) {
    const g = el('g', { class: 'pip-bubble' }, svg);
    const w = Math.max(60, text.length * 13 + 28);
    el('rect', { x: -w / 2, y: -20, width: w, height: 36, rx: 18 }, g);
    el('text', { x: 0, y: -1 }, g).textContent = text;
    put(g, x, y);
    return g;
  }
  const numBtn = (label, onTap, cls = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pl-num ${cls}`;
    b.textContent = label;
    b.addEventListener('click', () => onTap(b));
    tray.appendChild(b);
    return b;
  };
  const alive = (tok) => tok === app.token;
  const COLOURS = ['var(--accent)', 'var(--done)', 'var(--pivot)', 'var(--swap)', '#f08a24'];
  const view = (vb) => svg.setAttribute('viewBox', vb); // each game frames just its own content, so it fills a phone too

  // ---------- the four games ----------
  const GAMES = {
    // Some cookies are in the ten-frame. Tap how many more fill it.
    ten: {
      load(p) {
        const tok = app.token, cell = 62, fx = 400 - 2.5 * cell, fy = 40;
        view('120 0 560 440');
        const slot = (i) => (i < 10 ? [fx + (i % 5) * cell + cell / 2, fy + Math.floor(i / 5) * cell + cell / 2] : [400 + (i - 14) * 50, 215]); // extras line up below the frame
        const frame = el('g', { class: 'frame' }, svg);
        for (let i = 0; i < 10; i++) el('rect', { x: fx + (i % 5) * cell, y: fy + Math.floor(i / 5) * cell, width: cell, height: cell }, frame);
        for (let i = 0; i < p.a; i++) cookie(svg, ...slot(i), 'a', 22);
        app.pip = Pip.make(svg, 34);
        app.pip.place(400, 420);
        for (let n = 1; n <= 9; n++) {
          numBtn(n, async () => {
            if (app.busy) return;
            app.busy = true;
            const added = [];
            for (let k = 0; k < n; k++) {
              const c = cookie(svg, 400, 470, 'b', 22);
              added.push(c);
              await fly(c, ...slot(p.a + k), 240, 30);
              if (!alive(tok)) return;
            }
            if (n === p.need) { frame.classList.add('full'); app.pip.smile(0.11); bubble(400, 345, '10!'); return win(); }
            const hint = bubble(400, 345, n < p.need ? '+' : '−');
            app.pip.smile(-0.03);
            await wait(1000);
            if (!alive(tok)) return;
            added.forEach((c) => c.remove());
            hint.remove();
            app.pip.smile(0.05);
            app.busy = false;
          });
        }
      },
    },

    // a + x = b. Pick the x that makes the scale level.
    balance: {
      load(p) {
        const tok = app.token, Y = 250, K = 2.4;
        view('70 0 660 440');
        el('path', { d: `M 400 ${Y} L 368 ${Y + 90} L 432 ${Y + 90} Z`, class: 'stand' }, svg);
        const beam = el('g', {}, svg);
        el('line', { x1: 100, y1: Y, x2: 700, y2: Y, class: 'beam' }, beam);
        const tilt = (deg) => beam.setAttribute('transform', `rotate(${deg} 400 ${Y})`);
        const lean = (left) => Math.max(-16, Math.min(16, (p.b - left) * K)); // heavier side goes down
        let cursor = 128, box, boxText;
        const addBox = () => {
          box = el('g', { class: 'box' }, beam);
          el('rect', { x: cursor, y: Y - 70, width: 70, height: 70, rx: 12 }, box);
          boxText = el('text', { x: cursor + 35, y: Y - 35 }, box);
          boxText.textContent = '?';
          cursor += 86;
        };
        const addCookies = () => { for (let i = 0; i < p.a; i++) { cookie(beam, cursor + 11, Y - 12, 'b', 11); cursor += 24; } cursor += 10; };
        if (p.flip) { addCookies(); addBox(); } else { addBox(); addCookies(); }
        for (let i = 0; i < p.b; i++) cookie(beam, 440 + (i % 10) * 24 + 11, Y - 12 - Math.floor(i / 10) * 24, 'a', 11);
        tilt(lean(p.a));
        app.pip = Pip.make(svg, 30);
        app.pip.place(400, 425);
        for (const v of p.options) {
          numBtn(v, async () => {
            if (app.busy) return;
            app.busy = true;
            boxText.textContent = v;
            const from = lean(p.a), to = lean(p.a + v);
            await tween(500, (t) => tilt(from + (to - from) * ease(t)));
            if (!alive(tok)) return;
            if (v === p.x) { app.pip.smile(0.11); return win(); }
            app.pip.smile(-0.03);
            await wait(900);
            if (!alive(tok)) return;
            boxText.textContent = '?';
            await tween(400, (t) => tilt(to + (from - to) * ease(t)));
            app.pip.smile(0.05);
            app.busy = false;
          });
        }
      },
    },

    // Deal the cookies out fairly. What is left over goes to Pip.
    share: {
      load(p) {
        const tok = app.token, Y = 400;
        view('90 0 620 440');
        const pile = Array.from({ length: p.n }, (_, i) => cookie(svg, 400 + ((i % 10) - 4.5) * 34, 36 + Math.floor(i / 10) * 34, 'a', 14));
        const counts = Array(p.k).fill(0), stacks = counts.map(() => []);
        let left = p.n;
        const cx = (j) => 400 + (j - p.k / 2) * 130; // the critters, then Pip as the last guest
        const px = cx(p.k);
        const slot = (j, n) => [cx(j) - 36 + (n % 4) * 24, 304 - Math.floor(n / 4) * 24];
        app.pip = Pip.make(svg, 28);
        app.pip.place(px, Y);
        app.pip.g.style.cursor = 'pointer';
        el('circle', { cx: 0, cy: -34, r: 56, fill: 'transparent' }, app.pip.g);
        const after = async () => {
          if (shareSolved(counts, left)) { app.pip.smile(0.11); return win(); }
          if (left === 0) { // everything dealt, but not fairly: show it, then try again
            app.pip.smile(-0.03);
            bubble(400, 230, '≠');
            await wait(1300);
            if (alive(tok)) loadPuzzle();
            return;
          }
          app.busy = false;
        };
        for (let j = 0; j < p.k; j++) {
          const c = critter(cx(j), Y, j);
          c.style.cursor = 'pointer';
          c.addEventListener('click', async () => {
            if (app.busy || left === 0) return;
            app.busy = true;
            const n = pile[--left];
            stacks[j].push(n);
            await fly(n, ...slot(j, counts[j]++), 260, 40);
            if (alive(tok)) after();
          });
        }
        app.pip.g.addEventListener('click', async () => {
          if (app.busy) return;
          if (left === 0 || left >= p.k) { // not yet: there are still enough to deal another round
            app.busy = true;
            const b = bubble(px, 296, '…');
            await wait(700);
            b.remove();
            if (alive(tok)) app.busy = false;
            return;
          }
          app.busy = true;
          const n = pile[--left];
          await fly(n, px, 330, 280, 50);
          n.setAttribute('opacity', 0);
          if (alive(tok)) after();
        });
      },
    },

    // Find the hidden number. Tap the line to guess; the arrow says which way.
    guess: {
      load(p) {
        const tok = app.token, X0 = 60, X1 = 740, Y = 250;
        view('30 120 740 190');
        const X = (v) => X0 + ((v - 1) * (X1 - X0)) / (p.max - 1);
        const at = (px) => Math.max(1, Math.min(p.max, Math.round(1 + ((px - X0) * (p.max - 1)) / (X1 - X0))));
        let lo = 1, hi = p.max, used = 0;
        const range = el('rect', { x: X(1) - 10, y: Y - 5, width: X(p.max) - X(1) + 20, height: 10, rx: 5, class: 'nl-range' }, svg);
        el('line', { x1: X0 - 10, y1: Y, x2: X1 + 10, y2: Y, class: 'nl' }, svg);
        const labelled = p.max <= 16 ? 1 : p.max <= 32 ? 4 : 10;
        for (let v = 1; v <= p.max; v++) {
          const big = v === 1 || v === p.max || v % labelled === 0;
          if (p.max > 32 && !big) continue;
          el('line', { x1: X(v), y1: Y - 7, x2: X(v), y2: Y + 7, class: 'nl-tick' }, svg);
          if (big) el('text', { x: X(v), y: Y + 34, class: 'nl-num' }, svg).textContent = v;
        }
        const hit = el('rect', { x: 20, y: 120, width: 760, height: 220, fill: 'transparent' }, svg);
        app.pip = Pip.make(svg, 30);
        app.pip.place(X(Math.round((1 + p.max) / 2)), Y);
        const dots = Array.from({ length: p.par + 3 }, (_, i) => {
          const d = document.createElement('i');
          if (i === p.par - 1) d.className = 'par'; // halving is always enough by here
          tray.appendChild(d);
          return d;
        });
        let said = null;
        hit.addEventListener('pointerdown', async (e) => {
          if (app.busy) return;
          const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
          const v = at(pt.x);
          if (v < lo || v > hi) return; // dimmed: already ruled out
          app.busy = true;
          said?.remove();
          if (dots[used]) dots[used].classList.add('on');
          used++;
          await app.pip.hop(X(v), Y);
          if (!alive(tok)) return;
          const r = narrow(lo, hi, v, p.target);
          if (r.hit) {
            bubble(X(v), Y - 90, `${v}!`);
            app.pip.smile(0.11);
            return win();
          }
          lo = r.lo; hi = r.hi;
          said = bubble(X(v), Y - 90, v < p.target ? '→' : '←');
          const a0 = Number(range.getAttribute('x')), w0 = Number(range.getAttribute('width'));
          const a1 = X(lo) - 10, w1 = X(hi) - X(lo) + 20;
          await tween(350, (t) => { const k = ease(t); range.setAttribute('x', a0 + (a1 - a0) * k); range.setAttribute('width', w0 + (w1 - w0) * k); });
          if (alive(tok)) app.busy = false;
        });
      },
    },
  };

  // ---------- lines, piles and towers ----------
  const chipBtn = (c, onTap) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pl-colour c${c}`;
    b.setAttribute('aria-label', `Colour ${c + 1}`);
    b.addEventListener('click', () => onTap(b));
    tray.appendChild(b);
    return b;
  };
  function plate(x, y, c) {
    const g = el('g', { class: `plate c${c}` }, svg);
    el('rect', { x: -80, y: -15, width: 160, height: 30, rx: 12 }, g);
    put(g, x, y);
    return g;
  }

  // Who is next out? The line or pile is shown, then the changes; tap the colour you think comes out next.
  function containerLoad(p) {
    const tok = app.token, queue = p.mode === 'queue', Y = 330, m = p.ops.length;
    view('40 0 720 440');
    const spot = (i) => (queue ? [170 + i * 105, Y] : [400, 357 - i * 32]); // line: front at the left; pile: bottom first
    const make = (c, x, y) => { const g = queue ? critter(x, y, c) : plate(x, y, c); put(g, x, y, queue ? 0.82 : 1); return g; };
    if (queue) el('rect', { x: 50, y: Y - 128, width: 52, height: 128, rx: 12, class: 'door' }, svg);
    else el('rect', { x: 300, y: 372, width: 200, height: 10, rx: 5, class: 'beam' }, svg);
    const items = p.start.map((c, i) => ({ c, g: make(c, ...spot(i)) }));
    const chips = p.ops.map((op, k) => {
      const g = el('g', { class: `opchip ${op.t}` }, svg);
      el('circle', { r: 24, class: 'opc', style: op.t === 'in' ? `fill:${COLOURS[op.c]}` : '' }, g);
      el('text', { y: 1 }, g).textContent = op.t === 'in' ? '+' : '−';
      put(g, 400 + (k - (m - 1) / 2) * 84, 52);
      return g;
    });
    bubble(queue ? 76 : 560, queue ? 170 : 220, '?');
    app.pip = Pip.make(svg, 22);
    app.pip.place(700, 425);

    async function replay() {
      for (let k = 0; k < m; k++) {
        chips[k].classList.add('now');
        const op = p.ops[k];
        if (op.t === 'in') {
          const it = { c: op.c, g: make(op.c, queue ? 800 : 400, queue ? Y : -40) };
          items.push(it);
          await fly(it.g, ...spot(items.length - 1), 380, 40);
        } else {
          const it = queue ? items.shift() : items.pop();
          await fly(it.g, queue ? 66 : 650, queue ? Y - 30 : 300, 380, 40);
          it.g.remove();
          if (queue) await Promise.all(items.map((x, i) => fly(x.g, ...spot(i), 260, 0)));
        }
        if (!alive(tok)) return;
        await wait(220);
        chips[k].classList.remove('now');
        chips[k].classList.add('past');
      }
    }
    const colours = [...new Set([...p.start, ...p.ops.filter((o) => o.t === 'in').map((o) => o.c)])].sort();
    for (const c of colours) {
      chipBtn(c, async () => {
        if (app.busy) return;
        app.busy = true;
        await replay();
        if (!alive(tok)) return;
        items.find((it) => it.c === p.answer)?.g.classList.add('answer');
        if (c === p.answer) { app.pip.smile(0.11); return win(); }
        app.pip.smile(-0.03);
        await wait(1500);
        if (alive(tok)) loadPuzzle(); // the same puzzle again, now that the answer has been shown
      });
    }
  }

  // Tower of Hanoi. Tap a peg to lift its top disc, tap another to put it down. The bulb shows the recursive way.
  function towersLoad(p) {
    const tok = app.token, n = p.n, X = [170, 400, 630], BASE = 340, H = 32, UP = 80;
    view('40 0 720 440');
    const pegs = hanoiStart(n), w = (sz) => 36 + sz * 30;
    el('line', { x1: 60, y1: BASE + 2, x2: 740, y2: BASE + 2, class: 'ground' }, svg);
    for (const x of X) el('rect', { x: x - 6, y: BASE - 230, width: 12, height: 230, rx: 6, class: 'peg' }, svg);
    const discs = {};
    for (let sz = 1; sz <= n; sz++) {
      const g = el('g', { class: `disc d${sz % 5}` }, svg);
      el('rect', { x: -w(sz) / 2, y: -H / 2 + 2, width: w(sz), height: H - 4, rx: 12 }, g);
      discs[sz] = g;
    }
    const at = (peg, level) => [X[peg], BASE - H * (level + 1) + H / 2];
    const layout = () => pegs.forEach((st, i) => st.forEach((sz, l) => put(discs[sz], ...at(i, l))));
    const reset = () => { const st = hanoiStart(n); for (let i = 0; i < 3; i++) pegs[i] = st[i]; layout(); };
    layout();
    app.pip = Pip.make(svg, 22);
    app.pip.place(400, 432);
    let sel = null;
    const top = (i) => pegs[i][pegs[i].length - 1];

    async function tap(i) {
      if (app.busy) return;
      if (sel === null) {
        if (!pegs[i].length) return;
        sel = i;
        app.busy = true;
        await fly(discs[top(i)], X[i], UP, 180, 0);
        if (alive(tok)) app.busy = false;
        return;
      }
      const from = sel, sz = top(from);
      app.busy = true;
      sel = null;
      if (i === from) {
        await fly(discs[sz], ...at(from, pegs[from].length - 1), 180, 0);
      } else if (hanoiLegal(pegs, from, i)) {
        pegs[from].pop();
        pegs[i].push(sz);
        await fly(discs[sz], X[i], UP, 200, 0);
        await fly(discs[sz], ...at(i, pegs[i].length - 1), 200, 0);
        if (!alive(tok)) return;
        if (hanoiSolved(pegs, n)) { app.pip.smile(0.11); return win(); }
      } else { // a big disc on a small one: shake it and put it back
        app.pip.smile(-0.03);
        await tween(300, (t) => put(discs[sz], X[from] + Math.sin(t * 20) * 12 * (1 - t), UP));
        await fly(discs[sz], ...at(from, pegs[from].length - 1), 180, 0);
        app.pip.smile(0.05);
      }
      if (alive(tok)) app.busy = false;
    }
    for (const x of X) {
      const z = el('rect', { x: x - 100, y: 90, width: 200, height: 270, fill: 'transparent' }, svg);
      z.addEventListener('click', () => tap(X.indexOf(x)));
    }

    // Watch the recursive solution: small tower out of the way, the big disc across, small tower back on top.
    const bulb = document.createElement('button');
    bulb.type = 'button';
    bulb.className = 'pl-num';
    bulb.setAttribute('aria-label', 'Show me');
    bulb.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    bulb.addEventListener('click', async () => {
      if (app.busy) return;
      app.busy = true;
      sel = null;
      reset();
      discs[n].classList.add('big');
      for (const [a, b] of hanoiMoves(n)) {
        const sz = pegs[a].pop();
        pegs[b].push(sz);
        await fly(discs[sz], X[a], UP, 140, 0);
        await fly(discs[sz], X[b], UP, 220, 0);
        await fly(discs[sz], ...at(b, pegs[b].length - 1), 140, 0);
        if (!alive(tok)) return;
        await wait(sz === n ? 500 : 140);
      }
      await wait(700);
      if (!alive(tok)) return;
      discs[n].classList.remove('big');
      reset(); // now it is your turn
      app.busy = false;
    });
    tray.appendChild(bulb);
  }

  GAMES.line = { load: (p) => containerLoad(p) };
  GAMES.pile = { load: (p) => containerLoad(p) };
  GAMES.towers = { load: (p) => towersLoad(p) };

  // ---------- flow ----------
  function show(view) {
    for (const k in views) views[k].hidden = k !== view;
    $('b-reset').hidden = view !== 'game';
    dotsEl.hidden = view !== 'game';
    document.body.dataset.view = view;
  }
  function renderDots() {
    dotsEl.innerHTML = '';
    for (let i = 0; i < SET; i++) { const d = document.createElement('i'); d.className = i < app.i ? 'is-done' : i === app.i ? 'is-cur' : ''; dotsEl.appendChild(d); }
  }
  function loadPuzzle() {
    app.token++;
    app.busy = false;
    svg.innerHTML = '';
    view('0 0 800 440');
    tray.innerHTML = '';
    tray.className = `pl-tray tr-${app.game}`;
    renderDots();
    GAMES[app.game].load(app.set[app.i]);
  }
  async function win() {
    const tok = app.token;
    app.busy = true;
    await app.pip.bounce();
    if (!alive(tok)) return;
    await wait(500);
    if (!alive(tok)) return;
    app.i++;
    if (app.i >= SET) return finish();
    loadPuzzle();
  }
  async function finish() {
    const tok = ++app.token;
    globalThis.VLProgress?.mark(`play:${app.game}`);
    show('done');
    $('done-line').textContent = OFFLINE[app.game];
    const stage = $('done-stage');
    stage.innerHTML = '';
    const pip = Pip.make(stage, 70);
    pip.place(200, 205);
    pip.smile(0.11);
    for (let k = 0; k < 3 && alive(tok); k++) await pip.bounce();
  }
  function start(game) {
    app.game = game;
    app.set = { ten: tenSet, balance: balanceSet, share: shareSet, guess: guessSet, line: () => containerSet('queue'), pile: () => containerSet('stack'), towers: towersSet }[game]();
    app.i = 0;
    show('game');
    loadPuzzle();
  }
  function launcher() {
    app.token++;
    app.game = null;
    show('launcher');
  }
  function route() {
    const h = location.hash.slice(1);
    if (GAMES[h]) start(h); else launcher();
  }

  for (const t of document.querySelectorAll('[data-game]')) t.addEventListener('click', () => { location.hash = t.dataset.game; });
  $('b-home').addEventListener('click', () => { if (app.game) location.hash = ''; else location.href = '/'; });
  $('b-reset').addEventListener('click', () => { if (app.game) loadPuzzle(); });
  $('done-again').addEventListener('click', () => start(app.game));
  $('done-home').addEventListener('click', () => { location.hash = ''; });
  addEventListener('hashchange', route);
  document.addEventListener('vl:rest', () => { app.token++; });
  route();

  // ---------- install as an app ----------
  let installEvent = null;
  const install = $('b-install');
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; install.hidden = false; });
  install.addEventListener('click', async () => { if (installEvent) { installEvent.prompt(); installEvent = null; install.hidden = true; } });
  addEventListener('appinstalled', () => { install.hidden = true; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* the app still works online */ });
  }
})();
