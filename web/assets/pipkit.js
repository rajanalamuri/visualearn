/* Pip kit. Pip is drawn only with math: circles for the body and eyes, a parabola for the smile.
   Shared by every page that shows Pip. Also holds the tiny animation helpers. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 200) : ms));
  const tween = (ms, f) => new Promise((done) => {
    if (reduce || ms <= 0) { f(1); done(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      f(t);
      if (t < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  const ease = (t) => t * t * (3 - 2 * t);

  // Draws Pip into `parent`, standing with feet at (0, 0). `size` is the body radius.
  function make(parent, size = 32) {
    const s = size / 32;
    const g = el('g', { class: 'pip' }, parent);
    const shadow = el('ellipse', { cx: 0, cy: 2, rx: 26 * s, ry: 4 * s, class: 'pip-shadow' }, g);
    const body = el('g', {}, g);
    const squash = el('g', {}, body);
    el('circle', { cx: 0, cy: -32, r: 32, class: 'pip-body' }, squash);
    const eyes = el('g', {}, squash);
    const pupils = [];
    for (const ex of [-11, 11]) {
      el('circle', { cx: ex, cy: -38, r: 8, class: 'pip-eye' }, eyes);
      pupils.push(el('circle', { cx: ex, cy: -37, r: 3.6, class: 'pip-pupil' }, eyes));
    }
    const mouth = el('path', { class: 'pip-mouth' }, squash);
    let at = { x: 0, y: 0 };

    const api = {
      g,
      get x() { return at.x; },
      get y() { return at.y; },
      // The smile is a parabola through the mouth corners. k > 0 smiles, k < 0 frowns.
      smile(k) {
        const w = 11, y0 = -20 - (k < 0 ? 4 : 0);
        mouth.setAttribute('d', `M ${-w} ${y0} Q 0 ${y0 + 2 * k * w * w} ${w} ${y0}`);
      },
      look(dx = 0, dy = 0) {
        pupils.forEach((p, k) => {
          p.setAttribute('cx', (k ? 11 : -11) + dx * 2.6);
          p.setAttribute('cy', -37 + dy * 2.2);
        });
      },
      place(x, y, lift = 0, sy = 1) {
        at = { x, y };
        g.setAttribute('transform', `translate(${x} ${y})`);
        body.setAttribute('transform', `translate(0 ${-lift}) scale(${s})`);
        squash.setAttribute('transform', `scale(${1 / Math.sqrt(sy)} ${sy})`);
        shadow.setAttribute('opacity', Math.max(0.2, 1 - lift / 120));
      },
      blink() {
        return tween(160, (t) => eyes.setAttribute('transform',
          `translate(0 -38) scale(1 ${1 - 0.9 * Math.sin(Math.PI * t)}) translate(0 38)`));
      },
      // A hop is a parabola: height = 4h·t(1−t).
      async hop(x1, y1, h) {
        const { x: x0, y: y0 } = at;
        const d = Math.hypot(x1 - x0, y1 - y0);
        const height = h ?? Math.min(95, 24 + d * 0.3);
        api.look(Math.sign(x1 - x0), Math.sign(y1 - y0));
        await tween(110, (t) => api.place(x0, y0, 0, 1 - 0.12 * t));
        await tween(320 + d * 0.6, (t) => api.place(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 4 * height * t * (1 - t), 1.06));
        await tween(130, (t) => api.place(x1, y1, 0, 0.86 + 0.14 * t));
        api.look(0, 0);
      },
      bounce() { return tween(500, (t) => api.place(at.x, at.y, 22 * Math.sin(Math.PI * t), 1)); },
    };
    api.smile(0.05);
    api.place(0, 0);
    return api;
  }

  // Blinks every few seconds while the tab is visible. Returns a stop function.
  function blinker(pip) {
    const id = setInterval(() => { if (!document.hidden && !reduce) pip.blink(); }, 3800);
    return () => clearInterval(id);
  }

  globalThis.Pip = { NS, el, make, tween, wait, ease, reduce, blinker };
})();
