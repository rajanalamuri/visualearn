/* VisuaLearn profiles: a nickname and a colour, kept on this device only.
   - Every page gets a small chip in the header: your nickname, or "Join".
   - The diary page (/progress/) has the sign-up form and the switcher for everyone using this device.
   No email, no real name, no password, and nothing is sent anywhere. */
(() => {
  'use strict';
  const P = globalThis.VLProgress;
  if (typeof document === 'undefined' || !P) return;
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const initial = (p) => (p.name[0] || '?').toUpperCase();
  function dot(p) { const d = el('span', 'avatar', initial(p)); d.style.background = p.color; d.setAttribute('aria-hidden', 'true'); return d; }

  // ---- header chip ----
  const bar = document.querySelector('.top-in');
  if (bar) {
    const me = P.active();
    const a = el('a', me ? 'me' : 'me join-chip');
    a.href = me ? '/progress/#me' : '/progress/#join';
    if (me) { a.append(dot(me), el('span', 'me-name', me.name)); a.setAttribute('aria-label', `${me.name}'s page`); }
    else { a.textContent = 'Join'; a.setAttribute('aria-label', 'Join with a nickname'); }
    const timer = bar.querySelector('.timer');
    bar.insertBefore(a, timer || null);
  }

  // ---- sign-up and switcher (diary page only) ----
  const people = $('people'), form = $('join');
  if (!people || !form) return;
  const msg = $('join-msg'), nick = $('nick'), swatches = $('swatches'), add = $('add-person'), greet = $('greet');
  let color = null;

  function drawSwatches() {
    swatches.innerHTML = '';
    P.COLORS.forEach((c, i) => {
      const b = el('button', 'swatch'); b.type = 'button'; b.style.background = c;
      b.setAttribute('role', 'radio'); b.setAttribute('aria-label', `Colour ${i + 1}`); b.setAttribute('aria-checked', String(c === color));
      b.addEventListener('click', () => { color = c; drawSwatches(); });
      swatches.appendChild(b);
    });
  }
  function draw() {
    const all = P.profiles(), me = P.active();
    people.innerHTML = '';
    for (const p of all) {
      const li = el('li', p.id === (me && me.id) ? 'person on' : 'person');
      li.append(dot(p), el('b', '', p.name));
      if (p.id === (me && me.id)) li.append(el('span', 'tag', 'playing'));
      else { const sw = el('button', 'link', 'Switch'); sw.type = 'button'; sw.addEventListener('click', () => { P.switchTo(p.id); location.reload(); }); li.append(sw); }
      const rm = el('button', 'link danger', 'Remove'); rm.type = 'button'; rm.setAttribute('aria-label', `Remove ${p.name}`);
      rm.addEventListener('click', () => { if (confirm(`Remove ${p.name} and their diary from this device?`)) { P.remove(p.id); location.reload(); } });
      li.append(rm);
      people.appendChild(li);
    }
    const first = all.length === 0;
    form.hidden = !(first || form.dataset.open === '1');
    add.hidden = first || all.length >= P.MAX_PROFILES || form.dataset.open === '1';
    if (greet) greet.textContent = me ? `Hi, ${me.name}. This is your page.` : 'Pick a nickname to get your own page. It stays on this device.';
    drawSwatches();
  }
  add.addEventListener('click', () => { form.dataset.open = '1'; draw(); nick.focus(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = P.signUp(nick.value, color);
    if (!r.ok) { msg.textContent = r.why; nick.setAttribute('aria-invalid', 'true'); nick.focus(); return; }
    location.hash = '#me';
    location.reload();
  });
  nick.addEventListener('input', () => { msg.textContent = ''; nick.removeAttribute('aria-invalid'); });
  draw();
  if (location.hash === '#join' && !form.hidden) nick.focus();
})();
