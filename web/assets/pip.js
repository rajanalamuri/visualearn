/* Home page: Pip plays Guess My Number by binary search on a number line.
   Tap the line to hide a number. Seven dots show the most hops Pip can ever need. */
(() => {
  'use strict';
  const svg = document.getElementById('pip-stage');
  if (!svg || !globalThis.Pip) return;
  const { el, tween, wait, ease } = Pip;
  const dots = document.getElementById('pip-dots');
  const said = document.getElementById('pip-said'); // screen-reader text only
  const L = 50, R = 750, Y = 200;
  const X = (v) => L + ((v - 1) * (R - L)) / 99;

  el('line', { x1: L, y1: Y, x2: R, y2: Y, class: 'nl' }, svg);
  for (let v = 0; v <= 100; v += 10) {
    const n = Math.max(1, v);
    el('line', { x1: X(n), y1: Y - 6, x2: X(n), y2: Y + 6, class: 'nl-tick' }, svg);
    el('text', { x: X(n), y: Y + 30, class: 'nl-num' }, svg).textContent = n;
  }
  const range = el('rect', { x: L - 6, y: Y - 4, width: R - L + 12, height: 8, rx: 4, class: 'nl-range' }, svg);
  const found = el('text', { x: 0, y: Y + 60, class: 'flag-num', opacity: 0 }, svg);
  const pip = Pip.make(svg);
  const bubble = el('g', { class: 'pip-bubble', opacity: 0 }, svg);
  el('rect', { x: -40, y: -24, width: 80, height: 34, rx: 17 }, bubble);
  const bubbleText = el('text', { x: 0, y: -1 }, bubble);

  const dotEls = Array.from({ length: 7 }, () => { const d = document.createElement('i'); dots.appendChild(d); return d; });
  const state = { busy: false, ran: false };

  const say = (text) => {
    bubbleText.textContent = text;
    bubble.setAttribute('opacity', text ? 1 : 0);
    bubble.setAttribute('transform', `translate(${pip.x} ${Y - 92})`);
  };
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
    state.busy = state.ran = true;
    found.setAttribute('opacity', 0);
    dotEls.forEach((d) => (d.className = ''));
    pip.smile(0.05);
    say('');
    range.setAttribute('x', L - 6);
    range.setAttribute('width', R - L + 12);
    said.textContent = 'A number from 1 to 100 is hidden. Pip jumps to the middle of what is left.';
    let lo = 1, hi = 100, hops = 0;
    await wait(600);
    for (;;) {
      const mid = (lo + hi) >> 1;
      await pip.hop(X(mid), Y);
      dotEls[hops].className = 'on';
      hops++;
      say(`${mid}?`);
      await wait(600);
      if (mid === target) {
        say('Yes!');
        pip.smile(0.11);
        found.textContent = target;
        found.setAttribute('x', X(target));
        found.setAttribute('opacity', 1);
        dotEls[hops - 1].className = 'win';
        await pip.bounce();
        said.textContent = `Found ${target} in ${hops} hops. Tap the line to hide another number.`;
        state.busy = false;
        return;
      }
      const higher = target > mid;
      say(higher ? '→' : '←');
      said.textContent = `${mid}? ${higher ? 'Higher' : 'Lower'}.`;
      if (higher) lo = mid + 1; else hi = mid - 1;
      await shrink(lo, hi);
      await wait(200);
      say('');
    }
  }

  const random = () => 1 + Math.floor(Math.random() * 100);
  svg.addEventListener('click', (e) => {
    if (state.busy) return; // one search at a time
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const v = Math.round(1 + ((pt.x - L) * 99) / (R - L));
    if (v >= 1 && v <= 100) play(v);
  });
  svg.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !state.busy) { e.preventDefault(); play(random()); }
  });

  pip.place(X(50), Y);
  Pip.blinker(pip);
  // Plays once, when Pip scrolls into view. It never loops: the child decides whether to play again.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) {
      io.disconnect();
      setTimeout(() => { if (!state.ran) play(random()); }, 500);
    }
  });
  io.observe(svg);
})();
