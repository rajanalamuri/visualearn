/* The printable activity pack: filter by level (also from ?level=), then print only what is shown. */
(() => {
  'use strict';
  const bar = document.getElementById('act-levels'), grid = document.getElementById('acts');
  if (!bar || !grid) return;
  const cards = [...grid.children];
  const want = Number(new URLSearchParams(location.search).get('level'));
  function show(level) {
    cards.forEach((c) => { c.hidden = level !== 0 && Number(c.dataset.level) !== level; });
    [...bar.querySelectorAll('button[data-level]')].forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.level) === level)));
  }
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-level]');
    if (b) show(Number(b.dataset.level));
  });
  show([1, 2, 3].includes(want) ? want : 0);
})();
