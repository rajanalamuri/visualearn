/* Floating table of contents with scroll spy.
   Put data-toc on any container; every h2 and h3 inside becomes an entry.
   Wide screens: a quiet rail of dashes on the right edge that opens to titles on hover or focus.
   Phones and narrow windows: a round button that opens a bottom sheet. */
(() => {
  'use strict';

  // A URL-safe id from a heading's text, unique among the ids already taken.
  function slug(text, taken) {
    let base = String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
    let id = base, n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    taken.add(id);
    return id;
  }

  // Which heading is "current": the last one whose top has scrolled up to the line,
  // or the final one once the page has reached the bottom. -1 before the first heading.
  function activeIndex(tops, line, atBottom) {
    if (atBottom && tops.length) return tops.length - 1;
    let k = -1;
    for (let i = 0; i < tops.length; i++) if (tops[i] <= line) k = i;
    return k;
  }

  globalThis.VLToc = { slug, activeIndex };
  if (typeof document === 'undefined') return;

  const root = document.querySelector('[data-toc]');
  if (!root) return;
  const heads = [...root.querySelectorAll('h2, h3')];
  if (heads.length < 3) return;

  const taken = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
  const label = (h) => {
    if (h.dataset.tocLabel) return h.dataset.tocLabel;
    const c = h.cloneNode(true);
    c.querySelectorAll('span, small').forEach((e) => e.remove());
    return c.textContent.trim();
  };
  for (const h of heads) if (!h.id) h.id = slug(label(h), taken);

  const el = (tag, cls, attrs = {}) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const nav = el('nav', 'toc', { 'aria-label': 'On this page' });
  const fab = el('button', 'toc-fab', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'toc-panel', 'aria-label': 'Contents' });
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const scrim = el('div', 'toc-scrim');
  const panel = el('div', 'toc-panel', { id: 'toc-panel' });
  const list = el('ul', 'toc-list');
  const links = heads.map((h) => {
    const li = el('li');
    const a = el('a', `toc-a l${h.tagName === 'H3' ? 3 : 2}`, { href: `#${h.id}` });
    a.append(el('i', 'toc-bar'), Object.assign(el('span', 'toc-t'), { textContent: label(h) }));
    li.appendChild(a);
    list.appendChild(li);
    return a;
  });
  panel.appendChild(list);
  nav.append(scrim, panel, fab);
  document.body.appendChild(nav);

  let open = false;
  function setOpen(v, refocus) {
    open = v;
    nav.classList.toggle('open', v);
    fab.setAttribute('aria-expanded', String(v));
    if (v) links.find((a) => a.getAttribute('aria-current'))?.scrollIntoView({ block: 'center' });
    else if (refocus) fab.focus({ preventScroll: true });
  }
  fab.addEventListener('click', () => setOpen(!open));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false, true); });

  function go(h, push) {
    h.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (push) history.replaceState(null, '', `#${h.id}`);
    if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    go(heads[links.indexOf(a)], true);
    setOpen(false);
  });

  // sections hidden by a page filter (the roadmap's level buttons) leave the menu too
  const syncHidden = () => links.forEach((a, i) => { a.parentElement.hidden = !!heads[i].closest('[hidden]'); });
  document.addEventListener('vl:filter', syncHidden);
  syncHidden();

  // ---- scroll spy ----
  let current = -2, queued = false;
  function spy() {
    queued = false;
    const line = Math.min(140, innerHeight * 0.25);
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    const k = activeIndex(heads.map((h) => h.getBoundingClientRect().top), line, atBottom);
    if (k === current) return;
    current = k;
    links.forEach((a, i) => (i === k ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
    if (open && k >= 0) links[k].scrollIntoView({ block: 'nearest' });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(spy); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  spy();

  const hash = decodeURIComponent(location.hash.slice(1));
  const start = hash && document.getElementById(hash);
  if (start && heads.includes(start)) requestAnimationFrame(() => start.scrollIntoView({ block: 'start' }));
})();
