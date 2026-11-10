/* VisuaLearn math playground: + − × ÷ as four small cartoons.
   Each one shows a way of thinking, not a fact to memorise:
     +  make a ten first          −  take away and count what is left
     ×  clone a row, skip-count   ÷  deal one each, see what is left over
   All characters are original and, like Pip, drawn from circles, ellipses and parabolas. */
(() => {
  'use strict';

  // ---------- thinking, kept apart from drawing so it can be tested ----------
  // 8 + 5: move 2 across to fill the ten, 3 stay behind. 10 + 3 = 13.
  function makeTen(a, b) {
    const moved = Math.max(0, Math.min(10 - a, b));
    return { moved, first: a + moved, second: b - moved, sum: a + b };
  }
  // 4 × 3: three rows of four, counted 4, 8, 12.
  const skip = (a, b) => Array.from({ length: b }, (_, k) => a * (k + 1));
  // 14 ÷ 3: deal one each, round and round. Everyone gets 4, and 2 are left over.
  function share(a, b) {
    const q = Math.floor(a / b), r = a - q * b;
    const order = Array.from({ length: q * b }, (_, i) => i % b); // who gets each cookie, in turn
    return { q, r, order };
  }

  const OPS = {
    add: { sym: '+', a: [1, 9, 8], b: [1, 9, 5], off: 'Grab a handful of coins in each hand. Make a ten first, then count the rest.' },
    sub: { sym: '−', a: [1, 12, 9], b: [0, 12, 4], off: 'Line up 12 grapes. Eat 5. Count what is left before you look.' },
    mul: { sym: '×', a: [1, 9, 4], b: [1, 9, 3], off: 'Build 3 rows of 4 bricks. Turn it sideways. Did the number change?' },
    div: { sym: '÷', a: [1, 20, 14], b: [1, 5, 3], off: 'Deal 14 cards to 3 people, one each, round and round. What is left over?' },
  };
  const answer = (op, a, b) => (op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : share(a, b).q);

  globalThis.VLArith = { makeTen, skip, share, OPS, answer };

  // ---------- page ----------
  if (typeof document === 'undefined' || !globalThis.Pip) return;
  const { el, tween, wait, ease } = Pip;
  const $ = (id) => document.getElementById(id);
  const svg = $('stage'), ansEl = $('ans'), thinkEl = $('think'), symEl = $('sym'), offEl = $('off-line');
  const out = { a: $('val-a'), b: $('val-b') };
  const state = { op: 'add', a: 8, b: 5, token: 0, scene: null };

  // -- small drawing kit --
  const put = (n, x, y, s = 1) => { n._x = x; n._y = y; n.setAttribute('transform', `translate(${x} ${y}) scale(${s})`); };
  async function fly(n, x1, y1, ms = 360, h = 46) {
    const x0 = n._x, y0 = n._y;
    await tween(ms, (t) => { const e = ease(t); put(n, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - 4 * h * t * (1 - t)); });
    put(n, x1, y1);
  }
  const pop = (n, ms = 180) => { const x = n._x, y = n._y; return tween(ms, (t) => put(n, x, y, 0.2 + 0.8 * ease(t) + 0.25 * Math.sin(Math.PI * t))); };

  function cookie(x, y, kind = 'a', r = 15) {
    const g = el('g', { class: `ck ck-${kind}` }, svg);
    el('circle', { r }, g);
    for (const [cx, cy] of [[-5, -4], [5, -1], [-1, 6], [6, 7]]) el('circle', { cx: cx * r / 15, cy: cy * r / 15, r: r / 6.5, class: 'chip' }, g);
    put(g, x, y);
    return g;
  }
  function bubble(x, y, text) {
    const g = el('g', { class: 'pip-bubble' }, svg);
    const w = Math.max(60, text.length * 13 + 28);
    el('rect', { x: -w / 2, y: -20, width: w, height: 36, rx: 18 }, g);
    el('text', { x: 0, y: -1 }, g).textContent = text;
    put(g, x, y);
    pop(g);
    return g;
  }
  function label(x, y, text, cls = 'count') {
    const t = el('text', { x, y, class: cls }, svg);
    t.textContent = text;
    return t;
  }

  // Munch the rabbit: circles and ellipses. Gets rounder with every carrot.
  function munch(x, y) {
    const g = el('g', { class: 'munch' }, svg);
    const body = el('g', {}, g);
    for (const ex of [-13, 13]) {
      el('ellipse', { cx: ex, cy: -84, rx: 9, ry: 26, class: 'mu-fur', transform: `rotate(${ex / 2} ${ex} -60)` }, body);
      el('ellipse', { cx: ex, cy: -84, rx: 4, ry: 17, class: 'mu-pink', transform: `rotate(${ex / 2} ${ex} -60)` }, body);
    }
    el('circle', { cx: 0, cy: -34, r: 34, class: 'mu-fur' }, body);
    for (const ex of [-11, 11]) { el('circle', { cx: ex, cy: -44, r: 6.5, class: 'pip-eye' }, body); el('circle', { cx: ex - 2, cy: -43, r: 3, class: 'pip-pupil' }, body); }
    el('circle', { cx: 0, cy: -33, r: 3.4, class: 'mu-pink' }, body);
    el('rect', { x: -6, y: -28, width: 12, height: 11, rx: 2.5, class: 'mu-teeth' }, body);
    put(g, x, y);
    let fat = 0;
    const shape = (sq = 1) => body.setAttribute('transform', `scale(${(1 + 0.075 * fat) / Math.sqrt(sq)} ${(1 + 0.045 * fat) * sq})`);
    return { g, async chomp() { fat++; await tween(170, (t) => shape(1 - 0.14 * Math.sin(Math.PI * t))); shape(); } };
  }
  function carrot(x, y) {
    const g = el('g', { class: 'carrot' }, svg);
    for (const a of [-24, 0, 24]) el('ellipse', { cx: 0, cy: -27, rx: 3.6, ry: 10, class: 'leaf', transform: `rotate(${a} 0 -18)` }, g);
    el('path', { d: 'M -10 -18 Q 0 -24 10 -18 L 1.5 20 Q 0 23 -1.5 20 Z', class: 'root' }, g);
    put(g, x, y);
    return g;
  }
  // Blob monsters for sharing. Each is a circle with an antenna and one or two eyes.
  function critter(x, y, k) {
    const g = el('g', { class: `critter cr-${k % 5}` }, svg);
    el('path', { d: `M 0 -58 Q ${k % 2 ? 10 : -10} -72 ${k % 2 ? 4 : -4} -80`, class: 'antenna' }, g);
    el('circle', { cx: k % 2 ? 4 : -4, cy: -82, r: 5, class: 'cr-body' }, g);
    el('circle', { cx: 0, cy: -30, r: 30, class: 'cr-body' }, g);
    if (k % 2) { for (const ex of [-10, 10]) { el('circle', { cx: ex, cy: -36, r: 7, class: 'pip-eye' }, g); el('circle', { cx: ex, cy: -37, r: 3.2, class: 'pip-pupil' }, g); } }
    else { el('circle', { cx: 0, cy: -36, r: 12, class: 'pip-eye' }, g); el('circle', { cx: 0, cy: -38, r: 5, class: 'pip-pupil' }, g); }
    el('path', { d: 'M -8 -16 Q 0 -8 8 -16', class: 'pip-mouth' }, g);
    put(g, x, y);
    return g;
  }

  // -- the four cartoons. setup() draws the start; play() animates and returns the "thinking" line. --
  const SCENES = {
    add: {
      setup(a, b) {
        const slot = (i, fx) => [fx + (i % 5) * 56 + 28, 110 + Math.floor(i / 5) * 56 + 28];
        const frames = [60, 460].map((fx) => {
          const f = el('g', { class: 'frame' }, svg);
          for (let i = 0; i < 10; i++) el('rect', { x: fx + (i % 5) * 56, y: 110 + Math.floor(i / 5) * 56, width: 56, height: 56 }, f);
          return f;
        });
        for (let i = 0; i < a; i++) cookie(...slot(i, 60), 'a');
        const bs = Array.from({ length: b }, (_, i) => cookie(...slot(i, 460), 'b'));
        const pip = Pip.make(svg, 30);
        pip.place(400, 350);
        return { slot, frames, bs, pip };
      },
      async play(a, b, s, ok) {
        const { moved, first, second } = makeTen(a, b);
        s.pip.look(1, -1);
        for (let k = 0; k < moved; k++) {
          await fly(s.bs[b - 1 - k], ...s.slot(a + k, 60));
          if (!ok()) return;
        }
        s.pip.look(0, 0);
        if (first === 10) {
          s.frames[0].classList.add('full');
          bubble(400, 262, '10!');
          s.pip.smile(0.11);
          await s.pip.bounce();
          return second ? `10 + ${second}` : '';
        }
        return '';
      },
    },

    sub: {
      setup(a) {
        el('line', { x1: 30, y1: 262, x2: 770, y2: 262, class: 'ground' }, svg);
        const cs = Array.from({ length: a }, (_, i) => carrot(56 + i * 52, 240));
        return { cs, bunny: munch(726, 262) };
      },
      async play(a, b, s, ok) {
        for (let k = 0; k < b; k++) {
          const c = s.cs[a - 1 - k];
          await fly(c, 712, 232, 300 + (a - k) * 12, 60);
          if (!ok()) return;
          c.setAttribute('opacity', 0);
          await s.bunny.chomp();
        }
        if (b) bubble(690, 262 - 128 - b * 3, b >= 7 ? 'oof…' : b >= 4 ? 'burp' : 'yum');
        for (let i = 0; i < a - b; i++) label(56 + i * 52, 300, i + 1);
        return '';
      },
    },

    mul: {
      setup(a, b) {
        const cell = Math.min(64, 340 / b, 600 / a), x0 = 400 - (a * cell) / 2 + cell / 2, y0 = (410 - b * cell) / 2;
        const at = (r, c) => [x0 + c * cell, y0 + (r + 1) * cell - 3];
        const clone = (r, c) => {
          const p = Pip.make(svg, cell * 0.4);
          p.place(...at(r, c));
          [p.g._x, p.g._y] = at(r, c);
          p.smile(0.03 + Math.random() * 0.08);
          if (Math.random() < 0.18) p.look(Math.random() < 0.5 ? -1 : 1, 0); // somebody is always looking the wrong way
          return p;
        };
        clone(0, 0);
        return { cell, x0, at, clone };
      },
      async play(a, b, s, ok) {
        const counts = skip(a, b), labels = [];
        for (let c = 1; c < a; c++) { const p = s.clone(0, c); await pop(p.g, 110); if (!ok()) return; }
        for (let r = 0; r < b; r++) {
          if (r) {
            const row = Array.from({ length: a }, (_, c) => s.clone(r, c));
            await Promise.all(row.map((p) => pop(p.g, 200)));
            if (!ok()) return;
          }
          labels.forEach((t) => t.setAttribute('class', 'count old'));
          labels.push(label(s.x0 + (a - 0.5) * s.cell + 14, s.at(r, 0)[1] - s.cell * 0.25, counts[r], 'count left'));
          await wait(r === b - 1 ? 0 : 260);
        }
        return b > 1 && a > 1 ? counts.join(', ') : '';
      },
    },

    div: {
      setup(a, b) {
        const cx = (j) => 380 + (j - (b - 1) / 2) * 128;
        const pile = Array.from({ length: a }, (_, i) => cookie(380 + ((i % 10) - 4.5) * 30, 34 + Math.floor(i / 10) * 30, 'a', 12));
        for (let j = 0; j < b; j++) critter(cx(j), 372, j);
        const pip = Pip.make(svg, 24);
        pip.place(742, 110);
        pip.look(-1, 0);
        return { cx, pile, pip };
      },
      async play(a, b, s, ok) {
        const { q, r, order } = share(a, b);
        for (let i = 0; i < order.length; i++) {
          const j = order[i], k = Math.floor(i / b);
          await fly(s.pile[a - 1 - i], s.cx(j) - 39 + (k % 4) * 26, 258 - Math.floor(k / 4) * 26, 240, 30);
          if (!ok()) return;
        }
        for (let j = 0; j < b; j++) label(s.cx(j), 396, q, 'count mid');
        if (r) {
          bubble(700, 44, 'mine!');
          for (let i = 0; i < r; i++) {
            await fly(s.pile[r - 1 - i], 742, 84, 300, 30);
            if (!ok()) return;
            s.pile[r - 1 - i].setAttribute('opacity', 0);
          }
          s.pip.look(0, 0);
          s.pip.smile(0.11);
          await s.pip.bounce();
          return `${r} left over`;
        }
        return '';
      },
    },
  };

  // -- controls --
  function clampValues() {
    const o = OPS[state.op];
    state.a = Math.max(o.a[0], Math.min(o.a[1], state.a));
    state.b = Math.max(o.b[0], Math.min(o.b[1], state.b));
    if (state.op === 'sub') state.b = Math.min(state.b, state.a);
  }
  function setup() {
    state.token++;
    clampValues();
    svg.innerHTML = '';
    state.scene = SCENES[state.op].setup(state.a, state.b);
    out.a.textContent = state.a;
    out.b.textContent = state.b;
    symEl.textContent = OPS[state.op].sym;
    ansEl.textContent = '?';
    ansEl.classList.remove('got');
    thinkEl.textContent = '';
    offEl.textContent = OPS[state.op].off;
    $('b-flip').hidden = !(state.op === 'add' || state.op === 'mul'); // only + and × can swap sides
    for (const b of document.querySelectorAll('[data-op]')) b.setAttribute('aria-pressed', String(b.dataset.op === state.op));
    svg.setAttribute('aria-label', `${state.a} ${OPS[state.op].sym} ${state.b}, shown as a cartoon. Press play.`);
  }
  async function play() {
    setup();
    const token = state.token, { op, a, b } = state;
    const think = await SCENES[op].play(a, b, state.scene, () => token === state.token);
    if (token !== state.token) return;
    ansEl.textContent = answer(op, a, b);
    ansEl.classList.add('got');
    thinkEl.textContent = think || '';
  }

  for (const b of document.querySelectorAll('[data-op]')) {
    b.addEventListener('click', () => {
      state.op = b.dataset.op;
      state.a = OPS[state.op].a[2];
      state.b = OPS[state.op].b[2];
      history.replaceState(null, '', '#' + state.op);
      setup();
    });
  }
  for (const b of document.querySelectorAll('[data-step]')) {
    b.addEventListener('click', () => {
      const [which, d] = b.dataset.step.split(':');
      state[which] += Number(d);
      setup();
    });
  }
  $('b-play').addEventListener('click', play);
  $('b-flip').addEventListener('click', () => { [state.a, state.b] = [state.b, state.a]; play(); });
  document.addEventListener('vl:rest', () => { state.token++; });

  const fromHash = location.hash.slice(1);
  if (OPS[fromHash]) { state.op = fromHash; state.a = OPS[fromHash].a[2]; state.b = OPS[fromHash].b[2]; }
  setup();
})();
