/* VisuaLearn math lesson: the Sieve of Eratosthenes (finding primes) and
   Euclid's algorithm (greatest common divisor), shown as cutting squares off a rectangle. */
(() => {
  'use strict';

  const ALGOS = {
    sieve: {
      name: 'Sieve of Eratosthenes',
      blurb: 'A prime is a number with exactly two factors: 1 and itself. Over 2,000 years ago Eratosthenes found them all by crossing out multiples. Whatever is never crossed out is prime.',
      facts: [['Invented', 'About 240 BC'], ['Stops at', '√N'], ['Work', 'O(N log log N)']],
      code: [
        'write the numbers 2 … N',
        'for p = 2, 3, … while p×p ≤ N',
        '  if p not crossed out: prime',
        '    cross out p×p, p×p+p, … ≤ N',
        'every number left is prime',
      ],
      offline: {
        title: 'The hundred square',
        need: 'Paper, a pencil and three or four colours',
        time: '20 minutes',
        steps: [
          'Draw a 10 by 10 grid and write the numbers 1 to 100, ten to a row.',
          'Shade 1. It is not prime.',
          'Circle 2. With one colour, shade every second number after it: 4, 6, 8 …',
          'Circle 3, the next number that is not shaded. With a new colour, shade every third number after it.',
          'Keep going with 5 and 7. Every number still not shaded is prime. Circle them all.',
        ],
        think: 'You could stop after 7. Why do you never need to cross out with 11 when you go up to 100?',
      },
    },

    euclid: {
      name: "Euclid's GCD",
      blurb: 'The greatest common divisor of two numbers is the biggest number that divides both. Euclid found it by cutting the biggest squares he could off a rectangle, again and again, until no strip was left.',
      facts: [['Invented', 'About 300 BC'], ['Uses', 'Fractions, gears'], ['Work', 'O(log n)']],
      code: [
        'gcd(a, b)   // a × b rectangle',
        '  while b > 0',
        '    k ← how many b×b fit in a',
        '    cut off k squares',
        '    a, b ← b, a − k×b',
        '  return a',
      ],
      offline: {
        title: 'Squares from a sheet',
        need: 'Squared paper, scissors and a pencil',
        time: '15 minutes',
        steps: [
          'Cut a rectangle 21 squares long and 13 squares wide out of squared paper.',
          'Fold the short side down to make the biggest square you can. Cut it off.',
          'Do the same with the strip that is left, and keep going.',
          'Write down the size of every square you cut. The last, smallest square is the GCD.',
          'Try again with 12 by 8. Can tiles of the smallest size fill the whole first rectangle?',
        ],
        think: 'With 21 by 13 your squares were 13, 8, 5, 3, 2, 1, 1. Each number is the sum of the next two. Can you find a rectangle where every cut makes exactly one square?',
      },
    },
  };

  // ---------- sieve ----------
  function recordSieve(N) {
    const crossed = new Set(), primes = new Set(), frames = [];
    let c = 0;
    const rec = (m, line, note, q) => frames.push({
      crossed: [...crossed], primes: [...primes], p: m.p ?? 0, hit: m.hit ?? 0, line, note, c, q: q || null,
    });
    rec({}, -1, `Press play to find every prime up to ${N}.`);
    rec({}, 0, `Write the numbers from 2 to ${N}. 1 is special: it isn't prime.`);
    let p = 2;
    for (; p * p <= N; p++) {
      if (crossed.has(p)) { rec({ p }, 2, `${p} is crossed out, so it isn't prime. Skip it.`); continue; }
      primes.add(p);
      rec({ p }, 2, `${p} isn't crossed out, so ${p} is prime.`, p > 2 ? {
        text: `${p} is prime. Which number will it cross out first?`,
        options: [String(2 * p), String(p * p)],
        answer: 1,
        why: `Multiples smaller than ${p} × ${p}, like ${2 * p}, have a smaller factor, so they're already crossed out.`,
      } : null);
      for (let m = p * p; m <= N; m += p) {
        c++;
        const already = crossed.has(m);
        crossed.add(m);
        rec({ p, hit: m }, 3, already ? `${m} = ${p} × ${m / p}. It's already crossed out.` : `Cross out ${m} = ${p} × ${m / p}.`);
      }
    }
    rec({ p }, 1, `Next is ${p}, but ${p} × ${p} = ${p * p} is bigger than ${N}.`, {
      text: `${p} × ${p} = ${p * p}, which is bigger than ${N}. Is anything left to cross out?`,
      options: ['Yes', 'No'],
      answer: 1,
      why: `Every number up to ${N} that isn't prime has a factor of ${Math.floor(Math.sqrt(N))} or less, so it's already crossed out.`,
    });
    for (let k = 2; k <= N; k++) if (!crossed.has(k)) primes.add(k);
    rec({}, 4, `Everything left is prime. There are ${primes.size} primes up to ${N}.`);
    return frames;
  }

  // ---------- Euclid ----------
  // The rectangle is always drawn wider than tall: a is the width, b the height.
  function recordEuclid(A, B) {
    const a0 = Math.max(A, B), b0 = Math.min(A, B), frames = [], squares = [];
    let x = 0, y = 0, w = a0, h = b0, c = 0, last = 0;
    const rec = (line, note, q, cur) => frames.push({
      squares: squares.slice(), rest: [x, y, w, h], cur: cur ?? -1, a: a0, b: b0, line, note, c, q: q || null,
    });
    rec(-1, `Press play to find the GCD of ${a0} and ${b0}.`);
    rec(0, `A ${a0} × ${b0} rectangle. What is the biggest square tile that fills it exactly?`);
    while (w > 0 && h > 0) {
      const side = Math.min(w, h), long = Math.max(w, h), k = Math.floor(long / side);
      c++;
      last = side;
      const hiOpt = c % 2 === 1 || k < 2;
      rec(2, `The short side is ${side}. How many ${side} × ${side} squares fit along ${long}?`, {
        text: `How many ${side} × ${side} squares fit along ${long}?`,
        options: hiOpt ? [String(k), String(k + 1)] : [String(k - 1), String(k)],
        answer: hiOpt ? 0 : 1,
        why: `${k} × ${side} = ${k * side}${k * side === long ? `, exactly ${long}.` : `, and ${k + 1} × ${side} = ${(k + 1) * side} is too long.`}`,
      });
      const bulk = k > 6; // cut many small squares in one go so the lesson doesn't drag
      for (let i = 0; i < k; i++) {
        squares.push(w >= h ? [x + i * side, y, side, c] : [x, y + i * side, side, c]);
        if (!bulk) rec(3, `Cut square ${i + 1}: ${side} × ${side}.`, null, squares.length - 1);
      }
      if (bulk) rec(3, `Cut ${k} squares of ${side} × ${side}.`, null, squares.length - 1);
      if (w >= h) { x += k * side; w -= k * side; } else { y += k * side; h -= k * side; }
      const left = long - k * side;
      rec(4, left ? `${long} = ${k} × ${side} + ${left}. A ${Math.max(w, h)} × ${Math.min(w, h)} strip is left.`
        : `${long} = ${k} × ${side} exactly. Nothing is left over!`);
    }
    rec(5, `The last squares are ${last} × ${last}, so the GCD of ${a0} and ${b0} is ${last}. Tiles that size fill the whole rectangle.`);
    return frames;
  }

  const PAIRS = [[21, 13], [48, 18], [60, 24], [35, 15], [42, 30], [34, 21], [45, 27], [56, 21], [40, 16]];

  globalThis.VLMath = { ALGOS, recordSieve, recordEuclid };

  // ---------- page ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const view = $('view'), upto = $('upto'), wIn = $('rect-w'), hIn = $('rect-h'), err = $('rect-err');
  const SVG = 'http://www.w3.org/2000/svg';
  let cellEls = [];
  let pairIdx = 0;

  function readRect() {
    const a = Number(wIn.value), b = Number(hIn.value);
    if (![a, b].every((v) => Number.isInteger(v) && v >= 1 && v <= 60)) return null;
    return [a, b];
  }

  const lesson = {
    algos: ALGOS,
    record(key) {
      if (key === 'sieve') return recordSieve(Number(upto.value));
      return recordEuclid(...(readRect() || PAIRS[0]));
    },
    setup(key, frames) {
      for (const el of document.querySelectorAll('[data-for]')) el.hidden = el.dataset.for !== key;
      view.innerHTML = '';
      cellEls = [];
      if (key === 'sieve') {
        view.className = 'sieve';
        const N = Number(upto.value);
        for (let k = 1; k <= N; k++) {
          const d = document.createElement('div');
          d.textContent = k;
          view.appendChild(d);
          cellEls.push(d);
        }
      } else {
        view.className = 'euclid';
        const { a, b } = frames[0];
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', `-0.5 -0.5 ${a + 1} ${b + 1}`);
        svg.setAttribute('role', 'img');
        view.appendChild(svg);
      }
    },
    render(f, key) {
      if (key === 'sieve') {
        const crossed = new Set(f.crossed), primes = new Set(f.primes);
        cellEls.forEach((el, k) => {
          const v = k + 1;
          let cls = v === 1 ? 'one' : primes.has(v) ? 'prime' : crossed.has(v) ? 'crossed' : '';
          if (v === f.hit) cls += ' hit';
          else if (v === f.p) cls += ' cur';
          if (f.p > 1 && v % f.p === 0 && crossed.has(v)) cls += ' mult';
          el.className = cls;
        });
        view.setAttribute('aria-label', `Numbers 1 to ${cellEls.length}. Primes found so far: ${f.primes.join(', ') || 'none'}.`);
        return;
      }
      const svg = view.firstChild;
      svg.innerHTML = '';
      const add = (tag, attrs, text) => {
        const el = document.createElementNS(SVG, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        if (text != null) el.textContent = text;
        svg.appendChild(el);
        return el;
      };
      add('rect', { x: 0, y: 0, width: f.a, height: f.b, class: 'eu-frame' });
      f.squares.forEach(([sx, sy, side, round], k) => {
        add('rect', { x: sx, y: sy, width: side, height: side, class: `eu-sq r${(round - 1) % 4}${k === f.cur ? ' now' : ''}` });
        if (side >= f.a / 12) add('text', { x: sx + side / 2, y: sy + side / 2, 'font-size': Math.max(side / 4, f.a / 40), class: 'eu-label' }, side);
      });
      const [rx, ry, rw, rh] = f.rest;
      if (rw > 0 && rh > 0) add('rect', { x: rx, y: ry, width: rw, height: rh, class: 'eu-rest' });
      svg.setAttribute('aria-label', `A ${f.a} by ${f.b} rectangle with ${f.squares.length} squares cut off.`);
    },
    stats(f, key) {
      if (key === 'sieve') return [['Primes', f.primes.length], ['Cross-outs', f.c]];
      return [['Rounds', f.c], ['Squares', f.squares.length]];
    },
  };

  const player = VLPlayer.mount(lesson);
  upto.addEventListener('change', () => player.restart());
  $('rect-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!readRect()) { err.textContent = 'Use whole numbers from 1 to 60.'; return; }
    err.textContent = '';
    player.restart();
  });
  $('b-pair').addEventListener('click', () => {
    pairIdx = (pairIdx + 1) % PAIRS.length;
    [wIn.value, hIn.value] = PAIRS[pairIdx].map(String);
    err.textContent = '';
    player.restart();
  });
})();
