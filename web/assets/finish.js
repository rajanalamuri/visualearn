/* The card at the end of every lesson.
   When a lesson reaches its last step, the page already says how the guesses went. This adds what matters:
   the big idea in one line, where you are on the roadmap, and what to do next. It ties the lesson to the diary and the map. */
(() => {
  'use strict';

  // The first sentence of the lesson's blurb is its big idea.
  function idea(blurb) {
    const t = String(blurb || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    const m = t.match(/^.+?[.!?](?=\s|$)/);
    return (m ? m[0] : t).trim();
  }
  function progressLine(name, met, total) {
    const who = name ? `${name}, you have` : 'You have';
    if (met >= total && total > 0) return `${who} explored every idea on the map. Now use them.`;
    return `${who} explored ${met} of ${total} ideas on this device.`;
  }
  // The lesson after the current one, from the row of lesson buttons: { key, name } or null.
  function nextLesson(buttons) {
    const i = buttons.findIndex((b) => b.pressed);
    return i >= 0 && i + 1 < buttons.length ? buttons[i + 1] : null;
  }
  globalThis.VLFinish = { idea, progressLine, nextLesson };
  if (typeof document === 'undefined') return;

  const done = document.getElementById('done'), list = document.getElementById('algos');
  if (!done || !list) return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  const card = el('div', 'finish');
  card.hidden = true;
  done.appendChild(card);

  function fill() {
    card.innerHTML = '';
    const blurb = (document.getElementById('algo-blurb') || {}).textContent;
    const big = idea(blurb);
    if (big) { card.append(el('p', 'eyebrow', 'The big idea'), el('p', 'finish-idea', big)); }
    const P = globalThis.VLProgress, C = globalThis.VLCatalog;
    if (P && C) {
      const me = P.active();
      card.append(el('p', 'finish-prog', progressLine(me && me.name, P.everMet().length, Object.keys(C.IDEAS).length)));
      if (!me) { const j = el('a', 'link', 'Join with a nickname to keep your own page'); j.href = '/progress/#join'; card.append(j); }
    }
    const row = el('div', 'rest-actions');
    const buttons = [...list.children].map((b) => ({ key: b.dataset.algo, name: b.textContent, pressed: b.getAttribute('aria-pressed') === 'true', node: b }));
    const nxt = nextLesson(buttons);
    if (nxt) {
      const b = el('button', 'btn primary', `Next: ${nxt.name} →`); b.type = 'button';
      b.addEventListener('click', () => { nxt.node.click(); document.getElementById('lesson')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
      row.append(b);
    }
    const map = el('a', 'btn', 'See the roadmap'); map.href = '/curriculum/';
    row.append(map);
    card.append(row);
    card.hidden = false;
  }
  new MutationObserver(() => { if (!done.hidden) fill(); else card.hidden = true; }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
})();
