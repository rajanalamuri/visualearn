/* Lesson pages: open the fold-away box a link points at, and show the offline steps when printing. */
(() => {
  'use strict';
  const openTarget = () => {
    const t = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const d = t && (t.matches('details') ? t : t.querySelector('details'));
    if (d) d.open = true;
  };
  addEventListener('hashchange', openTarget);
  openTarget();
  addEventListener('beforeprint', () => document.querySelectorAll('.off-more').forEach((d) => { d.dataset.was = d.open ? '1' : ''; d.open = true; }));
  addEventListener('afterprint', () => document.querySelectorAll('.off-more').forEach((d) => { d.open = d.dataset.was === '1'; }));
})();
