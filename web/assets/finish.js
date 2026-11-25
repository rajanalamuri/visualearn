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
  const MAIL = 'rajanalamuri@gmail.com';
  // The page for a lesson that can be read, printed and shared: /learn/<page>-<key>/
  const slugFor = (pagePath, key) => `${String(pagePath).replace(/^\/+|\/+$/g, '').replace(/\//g, '-')}-${key}`;
  const feedbackLink = (name, id) => `mailto:${MAIL}?subject=${encodeURIComponent('VisuaLearn feedback: ' + name)}&body=${encodeURIComponent(`Lesson: ${id}

What was confusing or missing?
`)}`;
  globalThis.VLFinish = { idea, progressLine, nextLesson, slugFor, feedbackLink };
  if (typeof document === 'undefined') return;

  const done = document.getElementById('done'), list = document.getElementById('algos');
  if (!done || !list) return;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // who this lesson is for, and a title that names the lesson (for tabs, bookmarks and shares)
  const baseTitle = document.title, h1 = document.querySelector('.viz-head h1');
  const chip = el('p', 'lvl');
  if (h1) h1.after(chip);
  function levelChip() {
    const C = globalThis.VLCatalog, pressed = list.querySelector('[aria-pressed="true"]');
    if (!pressed) return;
    document.title = `${pressed.textContent} · ${baseTitle}`;
    const lv = C ? C.levelOfIdea(`${location.pathname.split('/').filter(Boolean).pop()}:${pressed.dataset.algo}`) : 0;
    chip.textContent = lv ? C.LEVEL_LABEL[lv].replace('· ', '· ages ') : '';
    chip.className = lv ? `lvl lvl${lv}` : 'lvl';
    chip.hidden = !lv;
  }
  const nameEl = document.getElementById('algo-name');
  if (nameEl) new MutationObserver(levelChip).observe(nameEl, { childList: true, characterData: true, subtree: true });
  levelChip();

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
      if (!me) { const j = el('a', 'link', 'Sign up with a nickname to keep your own page'); j.href = '/progress/#join'; card.append(j); }
    }
    // "Was this clear?" is kept on this device. It only turns into an email if someone chooses to send it.
    const pressed = list.querySelector('[aria-pressed="true"]');
    if (pressed) {
      const path = location.pathname.replace(/^\/+|\/+$/g, ''), id = `${path.split('/').pop()}:${pressed.dataset.algo}`;
      let all = {};
      try { all = JSON.parse(localStorage.getItem('vl-fb') || '{}') || {}; } catch { all = {}; }
      const box = el('div', 'fb-row');
      const ask = () => {
        box.innerHTML = '';
        if (all[id] === undefined) {
          box.append(el('span', 'fb-q', 'Was this clear?'));
          for (const [label, v] of [['Yes', 1], ['Not really', 0]]) {
            const b = el('button', 'btn small', label); b.type = 'button';
            b.addEventListener('click', () => { all[id] = v; try { localStorage.setItem('vl-fb', JSON.stringify(all)); } catch { /* private mode */ } ask(); });
            box.append(b);
          }
        } else if (all[id] === 1) box.append(el('span', 'fb-q', 'Thanks, glad it made sense.'));
        else { const a = el('a', 'link', 'Tell us what was confusing'); a.href = feedbackLink(pressed.textContent, id); box.append(el('span', 'fb-q', 'Sorry about that.'), a); }
      };
      ask();
      card.append(box);
      const share = el('a', 'link', 'Read, print or share this lesson'); share.href = `/learn/${slugFor(path, pressed.dataset.algo)}/`;
      card.append(share);
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
