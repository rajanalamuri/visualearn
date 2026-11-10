/* Pip: a cartoon drawn only with math (circles and parabolas) who plays Guess My Number by binary search.
   Tap the number line to hide a number. Pip always finds it in 7 hops or fewer. */
(() => {
  'use strict';
  const svg = document.getElementById('pip-stage');
  if (!svg) return;
  const status = document.getElementById('pip-status');
  const again = document.getElementById('pip-again');
  const NS = 'http://www.w3.org/2000/svg';
  const L = 50, R = 750, Y = 200;
  const X = (v) => L + ((v - 1) * (R - L)) / 99;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  // ---- scene ----
  el('line', { x1: L, y1: Y, x2: R, y2: Y, class: 'nl' });
  for (let v = 0; v <= 100; v += 10) {
    const n = Math.max(1, v);
    el('line', { x1: X(n), y1: Y - 6, x2: X(n), y2: Y + 6, class: 'nl-tick' });
    el('text', { x: X(n), y: Y + 30, class: 'nl-num' }).textContent = n;
  }
  const range = el('rect', { x: L, y: Y - 4, width: R - L, height: 8, rx: 4, class: 'nl-range' });
  const flag = el('g', { class: 'pip-flag', opacity: 0 });
  const flagNum = el('text', { x: 0, y: 30, class: 'flag-num' }, flag);

  const pip = el('g', { class: 'pip' });
  const squash = el('g', {}, pip);
  el('ellipse', { cx: 0, cy: 2, rx: 26, ry: 4, class: 'pip-shadow' }, pip);
  el('circle', { cx: 0, cy: -32, r: 32, class: 'pip-body' }, squash);
  const eyes = el('g', {}, squash);
  const pupils = [];
  for (const ex of [-11, 11]) {
    el('circle', { cx: ex, cy: -38, r: 8, class: 'pip-eye' }, eyes);
    pupils.push(el('circle', { cx: ex, cy: -37, r: 3.6, class: 'pip-pupil' }, eyes));
  }
  const mouth = el('path', { class: 'pip-mouth' }, squash);
  const bubble = el('g', { class: 'pip-bubble', opacity: 0 });
  el('rect', { x: -38, y: -24, width: 76, height: 34, rx: 17 }, bubble);
  const bubbleText = el('text', { x: 0, y: -1 }, bubble);

  // The smile is a parabola y = k·x² through the mouth corners; k grows when Pip is happy.
  const smile = (k) => {
    const w = 11, y0 = -20;
    mouth.setAttribute('d', `M ${-w} ${y0} Q 0 ${y0 + 2 * k * w * w} ${w} ${y0}`);
  };

  // ---- motion ----
  const state = { x: X(50), lo: 1, hi: 100, busy: false, target: 0, run: 0 };
  const place = (x, lift = 0, sy = 1) => {
    pip.setAttribute('transform', `translate(${x} ${Y - lift})`);
    squash.setAttribute('transform', `scale(${1 / Math.sqrt(sy)} ${sy})`);
    bubble.setAttribute('transform', `translate(${x} ${Y - 92 - lift})`);
  };
  const look = (dir) => pupils.forEach((p, k) => p.setAttribute('cx', (k ? 11 : -11) + dir * 2.6));
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 250) : ms));
  const tween = (ms, f) => new Promise((done) => {
    if (reduce) { f(1); done(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      f(t);
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  const ease = (t) => t * t * (3 - 2 * t);

  async function hop(x1) {
    const x0 = state.x, dx = x1 - x0, h = Math.min(95, 24 + Math.abs(dx) * 0.3);
    look(Math.sign(dx));
    await tween(120, (t) => place(x0, 0, 1 - 0.12 * t)); // crouch
    await tween(380 + Math.abs(dx) * 0.6, (t) => {
      place(x0 + dx * t, 4 * h * t * (1 - t), 1.06); // the jump is a parabola: y = 4h·t(1−t)
    });
    state.x = x1;
    await tween(140, (t) => place(x1, 0, 0.86 + 0.14 * t)); // land and squash
    look(0);
  }
  function say(text) {
    bubbleText.textContent = text;
    bubble.setAttribute('opacity', text ? 1 : 0);
  }
  async function shrink(lo, hi) {
    const a0 = Number(range.getAttribute('x')), w0 = Number(range.getAttribute('width'));
    const a1 = X(lo) - 6, w1 = X(hi) - X(lo) + 12;
    await tween(420, (t) => {
      const e = ease(t);
      range.setAttribute('x', a0 + (a1 - a0) * e);
      range.setAttribute('width', w0 + (w1 - w0) * e);
    });
  }

  async function play(target) {
    const run = ++state.run;
    state.busy = true;
    state.target = target;
    flag.setAttribute('opacity', 0);
    smile(0.05);
    say('');
    let lo = 1, hi = 100, hops = 0;
    range.setAttribute('x', L - 6);
    range.setAttribute('width', R - L + 12);
    status.textContent = 'A number from 1 to 100 is hidden. Pip always jumps to the middle of what is left.';
    await wait(700);
    while (run === state.run) {
      const mid = (lo + hi) >> 1;
      await hop(X(mid));
      if (run !== state.run) return;
      hops++;
      say(`${mid}?`);
      await wait(650);
      if (mid === target) {
        say('Yes!');
        smile(0.11);
        flagNum.textContent = target;
        flag.setAttribute('transform', `translate(${X(target)} ${Y})`);
        flag.setAttribute('opacity', 1);
        await tween(500, (t) => place(state.x, 22 * Math.sin(Math.PI * t), 1)); // a happy bounce
        status.textContent = `Found ${target} in ${hops} hop${hops === 1 ? '' : 's'}. Halving means 7 hops are always enough for 1 to 100. Tap the line to hide another.`;
        state.busy = false;
        return;
      }
      const higher = target > mid;
      say(higher ? 'Higher' : 'Lower');
      status.textContent = `Hop ${hops}: ${mid}? ${higher ? 'Higher' : 'Lower'}. Half the numbers are gone.`;
      if (higher) lo = mid + 1; else hi = mid - 1;
      await shrink(lo, hi);
      await wait(250);
      say('');
    }
  }

  // ---- input ----
  svg.addEventListener('click', (e) => {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const v = Math.round(1 + ((pt.x - L) * 99) / (R - L));
    if (v < 1 || v > 100 || state.busy) return; // one search at a time
    play(v);
  });
  svg.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !state.busy) { e.preventDefault(); play(1 + Math.floor(Math.random() * 100)); }
  });
  again.addEventListener('click', () => { if (!state.busy) play(1 + Math.floor(Math.random() * 100)); });

  // Blink now and then while waiting: a quick squash of the eyes.
  setInterval(() => {
    if (document.hidden || reduce) return;
    tween(160, (t) => eyes.setAttribute('transform', `translate(0 -38) scale(1 ${1 - 0.9 * Math.sin(Math.PI * t)}) translate(0 38)`));
  }, 3800);

  smile(0.05);
  place(state.x);
  status.textContent = 'Tap anywhere on the line to hide a number from Pip.';
  // Start once, when Pip scrolls into view. No loop: the child chooses whether to play again.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); setTimeout(() => { if (!state.run) play(1 + Math.floor(Math.random() * 100)); }, 500); }
  });
  io.observe(svg);
})();
