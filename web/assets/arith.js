/* VisuaLearn math playground: ten small cartoons, one per idea.
   Each one shows a way of thinking, not a fact to memorise:
     +   make a ten first               −   take away and count what is left
     ×   clone a row, skip-count        ÷   deal one each, see what is left over
     27+15  ten ones become a new ten   5−8  hop to zero, then keep going
     4/8    merge slices                2^5  everything doubles
     π      one turn is 3 and a bit     #7   add the last two
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
  // 27 + 15: the ones make 12, so ten of them become a new ten. 40 + 2.
  function regroup(a, b) {
    const ao = a % 10, bo = b % 10, carry = ao + bo >= 10 ? 1 : 0;
    return {
      carry, first: carry ? 10 - ao : bo, // ones that cross over before the frame is full
      tens: Math.floor(a / 10) + Math.floor(b / 10) + carry, ones: (ao + bo) % 10, sum: a + b,
    };
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // 4/8: every 4 slices merge into one. 1/2.
  function simplify(n, d) { const g = gcd(n, d); return { g, n: n / g, d: d / g }; }
  // 2^5: 1, 2, 4, 8, 16, 32.
  const powers = (a, b) => Array.from({ length: b + 1 }, (_, k) => a ** k);
  // Rabbit pairs each month: 1, 1, 2, 3, 5, 8 … each is the last two added.
  function fib(n) { const f = [1, 1]; while (f.length < n) f.push(f[f.length - 1] + f[f.length - 2]); return f.slice(0, n); }

  const OPS = {
    add: { sym: '+', a: [1, 9, 8], b: [1, 9, 5], off: 'Grab a handful of coins in each hand. Make a ten first, then count the rest.' },
    sub: { sym: '−', a: [1, 12, 9], b: [0, 12, 4], off: 'Line up 12 grapes. Eat 5. Count what is left before you look.' },
    mul: { sym: '×', a: [1, 9, 4], b: [1, 9, 3], off: 'Build 3 rows of 4 bricks. Turn it sideways. Did the number change?' },
    div: { sym: '÷', a: [1, 20, 14], b: [1, 5, 3], off: 'Deal 14 cards to 3 people, one each, round and round. What is left over?' },
    big: { sym: '+', a: [10, 49, 27], b: [10, 49, 15], off: 'Bundle straws in tens with rubber bands. Add 27 and 15. Can you make a new bundle?' },
    neg: { sym: '−', a: [0, 10, 5], b: [0, 20, 8], off: 'Chalk a number line on the ground with zero in the middle. Stand on 5 and walk back 8 steps.' },
    frac: { sym: '/', a: [1, 12, 4], b: [2, 12, 8], off: 'Fold a paper circle into 8 slices and colour 4. Now fold it in half. What do you see?' },
    pow: { sym: '^', a: [2, 3, 2], b: [0, 6, 5], off: 'Fold a sheet of paper in half, again and again. Count the layers each time. How far can you get?' },
    pi: { pre: 'π ×', a: [1, 4, 2], b: null, off: 'Wrap a string once around a plate. Lay the string across the plate. How many times does it fit?' },
    fib: { pre: '#', a: [1, 10, 7], b: null, off: 'Count the spirals on a pine cone or the petals on a daisy. Is your number in the list?' },
  };
  // Keeps a and b inside what each cartoon can draw.
  function clamp(op, a, b) {
    const o = OPS[op];
    a = Math.max(o.a[0], Math.min(o.a[1], a));
    if (!o.b) return [a, 0];
    b = Math.max(o.b[0], Math.min(o.b[1], b));
    if (op === 'sub') b = Math.min(b, a);
    if (op === 'neg') b = Math.min(b, a + 10); // the line stops at −10
    if (op === 'frac') a = Math.min(a, b);
    if (op === 'pow' && a === 3) b = Math.min(b, 4); // 81 clones is plenty
    return [a, b];
  }
  function answer(op, a, b) {
    switch (op) {
      case 'add': case 'big': return a + b;
      case 'sub': case 'neg': return a - b;
      case 'mul': return a * b;
      case 'div': return share(a, b).q;
      case 'frac': { const s = simplify(a, b); return s.d === 1 ? String(s.n) : `${s.n}/${s.d}`; }
      case 'pow': return a ** b;
      case 'pi': return (Math.PI * a).toFixed(2);
      default: return fib(a)[a - 1];
    }
  }

  globalThis.VLArith = { makeTen, skip, share, regroup, simplify, powers, fib, clamp, OPS, answer };

  // ---------- page ----------
  if (typeof document === 'undefined' || !globalThis.Pip) return;
  const { el, tween, wait, ease } = Pip;
  const $ = (id) => document.getElementById(id);
  const svg = $('stage'), ansEl = $('ans'), thinkEl = $('think'), symEl = $('sym'), preEl = $('pre'), offEl = $('off-line');
  const out = { a: $('val-a'), b: $('val-b') };
  const state = { op: 'add', a: 8, b: 5, token: 0, scene: null };
  const minus = (v) => String(v).replace('-', '−');

  // -- small drawing kit --
  const put = (n, x, y, s = 1) => { n._x = x; n._y = y; n.setAttribute('transform', `translate(${x} ${y}) scale(${s})`); };
  async function fly(n, x1, y1, ms = 360, h = 46) {
    const x0 = n._x, y0 = n._y;
    await tween(ms, (t) => { const e = ease(t); put(n, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - 4 * h * t * (1 - t)); });
    put(n, x1, y1);
  }
  const pop = (n, ms = 180) => { const x = n._x, y = n._y; return tween(ms, (t) => put(n, x, y, 0.2 + 0.8 * ease(t) + 0.25 * Math.sin(Math.PI * t))); };
  const fade = (n, to, ms = 300) => { const from = Number(n.getAttribute('opacity') ?? 1); return tween(ms, (t) => n.setAttribute('opacity', from + (to - from) * t)); };

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
  // A Pip whose group can be moved with put() and pop().
  function pipAt(x, y, size) {
    const p = Pip.make(svg, size);
    p.place(x, y);
    p.g._x = x; p.g._y = y;
    return p;
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
  // A small bunny for crowds: one circle, two ears.
  function bunny(x, y, r, baby) {
    const g = el('g', { class: baby ? 'bun baby' : 'bun' }, svg);
    for (const ex of [-0.4, 0.4]) el('ellipse', { cx: ex * r, cy: -r * 2.1, rx: r * 0.26, ry: r * 0.75 }, g);
    el('circle', { cx: 0, cy: -r, r }, g);
    if (r > 6) for (const ex of [-0.35, 0.35]) el('circle', { cx: ex * r, cy: -r * 1.15, r: r * 0.13, class: 'pip-pupil' }, g);
    put(g, x, y);
    return g;
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
  // A ten: one rod made of ten ones stuck together.
  function rod(x, y) {
    const g = el('g', { class: 'rod' }, svg);
    el('rect', { x: 0, y: 0, width: 16, height: 110, rx: 4 }, g);
    for (let i = 1; i < 10; i++) el('line', { x1: 0, y1: i * 11, x2: 16, y2: i * 11 }, g);
    put(g, x, y);
    return g;
  }
  function one(x, y, kind) {
    const g = el('g', { class: `one one-${kind}` }, svg);
    el('circle', { r: 10 }, g);
    put(g, x, y);
    return g;
  }
  function tenFrame(fx, fy, cell) {
    const f = el('g', { class: 'frame' }, svg);
    for (let i = 0; i < 10; i++) el('rect', { x: fx + (i % 5) * cell, y: fy + Math.floor(i / 5) * cell, width: cell, height: cell }, f);
    return f;
  }

  // -- the cartoons. setup() draws the start; play() animates and returns the "thinking" line. --
  const SCENES = {
    add: {
      setup(a, b) {
        const slot = (i, fx) => [fx + (i % 5) * 56 + 28, 110 + Math.floor(i / 5) * 56 + 28];
        const frames = [60, 460].map((fx) => tenFrame(fx, 110, 56));
        for (let i = 0; i < a; i++) cookie(...slot(i, 60), 'a');
        const bs = Array.from({ length: b }, (_, i) => cookie(...slot(i, 460), 'b'));
        return { slot, frames, bs, pip: pipAt(400, 350, 30) };
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
          const p = pipAt(...at(r, c), cell * 0.4);
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
          labels.forEach((t) => t.setAttribute('class', 'count left old'));
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
        const pip = pipAt(742, 110, 24);
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

    // 27 + 15: rods are tens, dots are ones. Ten dots squeeze into a new rod.
    big: {
      setup(a, b) {
        const rodX = (i, side) => (side ? 530 : 70) + i * 24;
        const slot = (i, fx) => [fx + (i % 5) * 30 + 15, 250 + Math.floor(i / 5) * 30 + 15];
        const frameA = tenFrame(70, 250, 30);
        tenFrame(530, 250, 30);
        const rodsA = Array.from({ length: Math.floor(a / 10) }, (_, i) => rod(rodX(i, 0), 70));
        const rodsB = Array.from({ length: Math.floor(b / 10) }, (_, i) => rod(rodX(i, 1), 70));
        const onesA = Array.from({ length: a % 10 }, (_, i) => one(...slot(i, 70), 'a'));
        const onesB = Array.from({ length: b % 10 }, (_, i) => one(...slot(i, 530), 'b'));
        return { rodX, slot, frameA, rodsA, rodsB, onesA, onesB, pip: pipAt(400, 396, 26) };
      },
      async play(a, b, s, ok) {
        const R = regroup(a, b), ao = a % 10, bo = b % 10, at = Math.floor(a / 10);
        const waiting = s.onesB.slice().reverse(); // take from the end of the pile
        s.pip.look(-1, -1);
        for (let k = 0; k < R.first; k++) {
          await fly(waiting[k], ...s.slot(ao + k, 70), 300);
          if (!ok()) return;
        }
        if (R.carry) {
          s.frameA.classList.add('full');
          bubble(400, 316, '10!');
          await wait(450);
          const ten = s.onesA.concat(waiting.slice(0, R.first));
          await Promise.all(ten.map((n, i) => fly(n, s.rodX(at, 0) + 8, 76 + i * 11, 420, 20))); // ten ones line up…
          if (!ok()) return;
          ten.forEach((n) => n.setAttribute('opacity', 0));
          const fresh = rod(s.rodX(at, 0), 70); // …and become one ten
          fresh.classList.add('new');
          await pop(fresh, 220);
          s.frameA.classList.remove('full');
          for (let k = R.first; k < bo; k++) {
            await fly(waiting[k], ...s.slot(k - R.first, 70), 300);
            if (!ok()) return;
          }
        }
        await Promise.all(s.rodsB.map((n, i) => fly(n, s.rodX(at + R.carry + i, 0), 70, 420, 30)));
        if (!ok()) return;
        s.pip.look(0, 0);
        s.pip.smile(0.11);
        if (R.tens) label(70 + R.tens * 12, 204, R.tens * 10, 'count mid');
        label(145, 334, R.ones, 'count mid');
        await s.pip.bounce();
        return `${R.tens * 10} + ${R.ones}`;
      },
    },

    // 5 − 8: hop back to zero, then keep going into the cold.
    neg: {
      setup(a) {
        const X = (v) => 400 + v * 36, Y = 250;
        el('rect', { x: 22, y: Y, width: 378, height: 78, rx: 10, class: 'cold' }, svg);
        el('line', { x1: 22, y1: Y, x2: 778, y2: Y, class: 'nl' }, svg);
        for (let v = -10; v <= 10; v++) {
          el('line', { x1: X(v), y1: Y - 5, x2: X(v), y2: Y + 5, class: 'nl-tick' }, svg);
          label(X(v), Y + 24, minus(v), v < 0 ? 'tick-num below' : 'tick-num');
        }
        return { X, Y, pip: pipAt(X(a), Y, 26) };
      },
      async play(a, b, s, ok) {
        const res = a - b;
        if (!b) return '';
        if (res < 0 && a > 0) {
          await s.pip.hop(s.X(0), s.Y);
          if (!ok()) return;
          await wait(300);
        }
        await s.pip.hop(s.X(res), s.Y);
        if (!ok()) return;
        label(s.X(res), s.Y + 56, minus(res));
        if (res < 0) {
          s.pip.smile(-0.03);
          bubble(s.X(res), s.Y - 92, 'brr!');
          return a > 0 ? `${a} to zero, ${b - a} more` : '';
        }
        return '';
      },
    },

    // 4/8 of a pizza: the cuts between merged slices vanish. 1/2.
    frac: {
      setup(a, b) {
        const cx = 320, cy = 205, r = 150;
        const pt = (i, rad = r) => { const t = -Math.PI / 2 + (i * 2 * Math.PI) / b; return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)]; };
        el('circle', { cx, cy, r: r + 10, class: 'crust' }, svg);
        el('circle', { cx, cy, r, class: 'cheese' }, svg);
        for (let i = 0; i < a; i++) {
          const [x0, y0] = pt(i), [x1, y1] = pt(i + 1);
          el('path', { d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`, class: 'slice' }, svg);
          const [px, py] = pt(i + 0.5, r * 0.62);
          el('circle', { cx: px, cy: py, r: Math.min(15, 70 / b + 5), class: 'pepperoni' }, svg);
        }
        const cuts = Array.from({ length: b }, (_, i) => { const [x, y] = pt(i); return el('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'cut' }, svg); });
        return { cuts, bunny: munch(650, 340) };
      },
      async play(a, b, s, ok) {
        const { g } = simplify(a, b);
        if (g > 1) {
          await Promise.all(s.cuts.filter((_, i) => i % g).map((c) => fade(c, 0, 600)));
          if (!ok()) return;
        }
        if (a === b) bubble(630, 204, 'all of it?');
        else if (g > 1) await s.bunny.chomp();
        return g > 1 ? `÷ ${g} top and bottom` : '';
      },
    },

    // 2^5: every Pip splits in two, again and again.
    pow: {
      setup(a, b) {
        const counts = powers(a, b), gap = Math.min(64, 372 / (b + 1));
        const row = (k) => {
          const n = counts[k], cell = Math.min(gap * 0.9, 640 / n), y = 16 + (k + 1) * gap, x0 = 370 - (n * cell) / 2 + cell / 2;
          return Array.from({ length: n }, (_, i) => {
            if (cell >= 16) return pipAt(x0 + i * cell, y, cell * 0.42).g;
            const d = el('g', {}, svg);
            el('circle', { cy: -cell * 0.42, r: cell * 0.42, class: 'pip-body' }, d);
            put(d, x0 + i * cell, y);
            return d;
          });
        };
        row(0);
        return { counts, gap, row, labels: [] };
      },
      async play(a, b, s, ok) {
        for (let k = 0; k <= b; k++) {
          if (k) {
            const nodes = s.row(k);
            await Promise.all(nodes.map((n) => pop(n, 220)));
            if (!ok()) return;
          }
          s.labels.forEach((t) => t.setAttribute('class', 'count right old'));
          s.labels.push(label(770, 16 + (k + 1) * s.gap - s.gap * 0.3, s.counts[k], 'count right'));
          await wait(k === b ? 0 : 320);
        }
        return b > 1 ? s.counts.join(', ') : '';
      },
    },

    // π: Pip rolls one full turn. The trail is 3 and a bit times as long as Pip is wide.
    pi: {
      setup(a) {
        const D = a * 45, r = D / 2, Y = 300, x0 = 40 + r;
        el('line', { x1: 20, y1: Y, x2: 780, y2: Y, class: 'ground' }, svg);
        // the measuring stick: exactly as long as Pip is wide
        el('rect', { x: x0 - r, y: Y - D - 34, width: D, height: 10, rx: 5, class: 'seg s0' }, svg);
        const segs = [0, 1, 2, 3].map((i) => el('rect', { x: x0 + i * D, y: Y + 10, width: 0, height: 10, rx: 5, class: `seg s${i % 2}` }, svg));
        const wheel = el('g', {}, svg);
        const pip = Pip.make(wheel, r);
        pip.place(0, r);
        pip.g.querySelector('.pip-shadow').setAttribute('display', 'none');
        const roll = (d) => {
          wheel.setAttribute('transform', `translate(${x0 + d} ${Y - r}) rotate(${(d / r) * (180 / Math.PI)})`);
          segs.forEach((sg, i) => sg.setAttribute('width', Math.max(0, Math.min(D, d - i * D))));
        };
        roll(0);
        return { D, r, Y, x0, roll, pip };
      },
      async play(a, b, s, ok) {
        const dist = Math.PI * s.D;
        await tween(1400 + a * 500, (t) => s.roll(dist * ease(t)));
        if (!ok()) return;
        for (let i = 0; i < 3; i++) label(s.x0 + (i + 0.5) * s.D, s.Y + 44, i + 1, 'count mid');
        label(s.x0 + 3 * s.D + 4, s.Y + 44, '+ a bit', 'count left small');
        s.pip.smile(0.11);
        bubble(Math.min(720, s.x0 + dist), s.Y - s.D - 30, 'wheee');
        return '3 and a bit';
      },
    },

    // Rabbit families: this month = last month's rabbits + new babies (one per pair from two months ago).
    fib: {
      setup(n) {
        const f = fib(n), gap = Math.min(40, 384 / n);
        const row = (k) => {
          const count = f[k], cell = Math.min(gap * 0.92, 620 / count), r = cell * 0.3;
          const y = 10 + (k + 1) * gap, x0 = 360 - (count * cell) / 2 + cell / 2;
          const grown = k ? f[k - 1] : 0; // everyone from last month; the rest are babies
          return Array.from({ length: count }, (_, i) => bunny(x0 + i * cell, y, i < grown ? r : r * 0.78, i >= grown));
        };
        row(0);
        return { f, gap, row, labels: [] };
      },
      async play(n, b, s, ok) {
        for (let k = 0; k < n; k++) {
          if (k) {
            const nodes = s.row(k);
            await Promise.all(nodes.map((d) => pop(d, 200)));
            if (!ok()) return;
          }
          s.labels.forEach((t) => t.setAttribute('class', 'count right old'));
          s.labels.push(label(770, 10 + (k + 1) * s.gap - s.gap * 0.3, s.f[k], 'count right'));
          await wait(k === n - 1 ? 0 : 300);
        }
        return n >= 3 ? `${s.f[n - 3]} + ${s.f[n - 2]}` : '';
      },
    },
  };

  // -- controls --
  function setup() {
    state.token++;
    const o = OPS[state.op];
    [state.a, state.b] = clamp(state.op, state.a, state.b);
    svg.innerHTML = '';
    state.scene = SCENES[state.op].setup(state.a, state.b);
    out.a.textContent = state.a;
    out.b.textContent = state.b;
    symEl.textContent = o.sym || '';
    preEl.textContent = o.pre || '';
    preEl.hidden = !o.pre;
    $('b-wrap').hidden = !o.b;
    ansEl.textContent = '?';
    ansEl.classList.remove('got');
    thinkEl.textContent = '';
    offEl.textContent = o.off;
    $('b-flip').hidden = !['add', 'mul', 'big'].includes(state.op); // only + and × can swap sides
    for (const b of document.querySelectorAll('[data-op]')) b.setAttribute('aria-pressed', String(b.dataset.op === state.op));
    svg.setAttribute('aria-label', `${o.pre || ''} ${state.a} ${o.b ? `${o.sym} ${state.b}` : ''}, shown as a cartoon. Press play.`);
  }
  async function play() {
    setup();
    const token = state.token, { op, a, b } = state;
    const think = await SCENES[op].play(a, b, state.scene, () => token === state.token);
    if (token !== state.token) return;
    ansEl.textContent = minus(answer(op, a, b));
    ansEl.classList.add('got');
    thinkEl.textContent = think || '';
  }
  function choose(op) {
    state.op = op;
    state.a = OPS[op].a[2];
    state.b = OPS[op].b ? OPS[op].b[2] : 0;
  }

  for (const b of document.querySelectorAll('[data-op]')) {
    b.addEventListener('click', () => {
      choose(b.dataset.op);
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
  if (OPS[fromHash]) choose(fromHash);
  setup();
})();
