/* VisuaLearn languages.
   The page's own English text is the key: a language file (/assets/i18n/<code>.json) maps exact English strings to the
   other language, and templates such as "{a} of {b} ready" cover text with numbers or names in it.
   This translates the interface (menus, buttons, home, roadmap, diary, parents, privacy). Lesson explanations stay in English
   until a language file for them exists; anything without an entry simply stays as it is.
   Opt a part of a page out with data-no-i18n. */
(() => {
  'use strict';
  const LANGS = { en: 'English', es: 'Español' };
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();

  // {a} {b} {c} {n} are whole numbers and {t} is a clock time, so a template can never rewrite an ordinary English sentence.
  const SHAPE = { a: '(\\d+)', b: '(\\d+)', c: '(\\d+)', n: '(\\d+)', t: '(\\d+:\\d+)' };
  function compile(strings) {
    const exact = new Map(), templates = [];
    for (const [k, v] of Object.entries(strings)) {
      if (/\{\w+\}/.test(k)) {
        const names = [];
        const src = k.split(/(\{\w+\})/).map((part) => {
          const m = part.match(/^\{(\w+)\}$/);
          if (m) { names.push(m[1]); return SHAPE[m[1]] || '(.+?)'; }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('');
        templates.push({ re: new RegExp(`^${src}$`), names, out: v, weight: k.replace(/\{\w+\}/g, '').length });
      } else exact.set(norm(k), v);
    }
    templates.sort((x, y) => y.weight - x.weight);
    return { exact, templates };
  }
  const keepSpace = (orig, out) => (/^\s/.test(orig) ? ' ' : '') + out + (/\s$/.test(orig) ? ' ' : '');

  // The translated text, or null when there is nothing to change.
  function translate(text, T, depth = 0) {
    const n = norm(text);
    if (!n || depth > 3) return null;
    if (T.exact.has(n)) return keepSpace(text, T.exact.get(n));
    for (const t of T.templates) {
      const m = t.re.exec(n);
      if (!m) continue;
      let out = t.out;
      t.names.forEach((nm, i) => { const sub = translate(m[i + 1], T, depth + 1); out = out.split(`{${nm}}`).join(sub === null ? m[i + 1] : sub.trim()); });
      return keepSpace(text, out);
    }
    const lead = n.match(/^· (.+)$/); // a breadcrumb piece such as "· Arrays and techniques"
    if (lead) { const r = translate(lead[1], T, depth + 1); if (r !== null) return keepSpace(text, `· ${r.trim()}`); }
    if (n.includes(' · ')) { // titles and labels joined with " · ": translate each piece
      let changed = false;
      const parts = n.split(' · ').map((p) => { const r = translate(p, T, depth + 1); if (r !== null) { changed = true; return r.trim(); } return p; });
      if (changed) return keepSpace(text, parts.join(' · '));
    }
    return null;
  }
  globalThis.VLI18n = { LANGS, compile, translate, norm };
  if (typeof document === 'undefined') return;

  // ---- which language ----
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const asked = new URLSearchParams(location.search).get('lang');
  if (asked && LANGS[asked]) store.set('vl-lang', asked);
  const saved = store.get('vl-lang'), browser = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  const lang = LANGS[saved] ? saved : LANGS[browser] ? browser : 'en';
  document.documentElement.lang = lang;

  // ---- the language picker, in the footer ----
  function picker() {
    const host = document.querySelector('.foot-in') || document.body;
    const label = document.createElement('label');
    label.className = 'lang-pick';
    const span = document.createElement('span');
    span.textContent = 'Language';
    const sel = document.createElement('select');
    sel.id = 'lang';
    for (const [code, name] of Object.entries(LANGS)) { const o = document.createElement('option'); o.value = code; o.textContent = name; o.selected = code === lang; sel.appendChild(o); }
    sel.addEventListener('change', () => { store.set('vl-lang', sel.value); const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString(); });
    label.append(span, sel);
    host.appendChild(label);
  }

  // ---- translating a page ----
  const OPT_OUT = '[data-no-i18n], script, style, noscript, code, pre, textarea, svg, #view, #note, #quiz, #code, #algo-blurb, #algo-facts, #off-need, #off-steps, #off-think, #off-title, .pip-card';
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  let T = null;
  const skip = (el) => !el || !!el.closest(OPT_OUT);
  function text(node) {
    if (skip(node.parentElement)) return;
    const r = translate(node.nodeValue, T);
    if (r !== null && r !== node.nodeValue) node.nodeValue = r;
  }
  function attrs(el) {
    if (skip(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const r = translate(el.getAttribute(a), T);
      if (r !== null && r !== el.getAttribute(a)) el.setAttribute(a, r);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { text(root); return; }
    if (root.nodeType !== 1) return;
    attrs(root);
    root.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(attrs);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) text(w.currentNode);
  }
  function start(strings) {
    T = compile(strings);
    const t = translate(document.title, T);
    if (t !== null) document.title = t;
    walk(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') text(m.target);
        else if (m.type === 'attributes') attrs(m.target);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  const KEY = `vl-i18n-${lang}`;
  function boot() {
    picker();
    if (lang === 'en') return;
    let cached = null;
    try { cached = JSON.parse(store.get(KEY) || 'null'); } catch { cached = null; }
    if (cached && cached.strings) start(cached.strings); // no flash of English on repeat visits
    fetch(`/assets/i18n/${lang}.json`).then((r) => (r.ok ? r.json() : Promise.reject(r))).then((d) => {
      if (!cached || cached.version !== d.version) { store.set(KEY, JSON.stringify(d)); if (!T) start(d.strings); else { T = compile(d.strings); walk(document.body); } }
      else if (!T) start(d.strings);
    }).catch(() => { /* offline or missing: the page stays in English */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
