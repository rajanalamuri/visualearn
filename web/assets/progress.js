/* VisuaLearn progress: a quiet diary of which ideas were explored on which day, kept per profile.
   It lives in this browser's localStorage and nowhere else. A profile is only a nickname and a colour:
   no email, no real name, no password. There are no streaks or scores on purpose: it shows what happened,
   it doesn't push for more. */
(() => {
  'use strict';
  const LEGACY = 'vl-log', PKEY = 'vl-profiles', AKEY = 'vl-active', KEEP_DAYS = 120, MAX_PROFILES = 5;
  const COLORS = ['#ffd93d', '#5be3b0', '#ff9ec7', '#b9a4ff', '#8fd3ff', '#ffb703', '#ff7a59', '#9be564'];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: nothing is kept */ } },
    del(k) { try { localStorage.removeItem(k); } catch { store.set(k, ''); } },
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // YYYY-MM-DD, local time

  // ---- profiles ----
  function profiles() {
    try {
      const a = JSON.parse(store.get(PKEY) || '[]');
      return Array.isArray(a) ? a.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string') : [];
    } catch { return []; }
  }
  const active = () => { const id = store.get(AKEY); return profiles().find((p) => p.id === id) || null; };
  const logKey = () => { const a = active(); return a ? `${LEGACY}:${a.id}` : LEGACY; };

  // A nickname, not a real name: 1 to 12 letters, numbers, spaces, apostrophes or hyphens; nothing that looks like an email or phone number.
  function checkName(raw) {
    const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!name) return { ok: false, why: 'Pick a nickname.' };
    if (name.length > 12) return { ok: false, why: 'Keep it to 12 letters or fewer.' };
    if (!/^[\p{L}\p{N} '-]+$/u.test(name)) return { ok: false, why: 'Use letters and numbers only.' };
    if ((name.match(/\d/g) || []).length > 3) return { ok: false, why: 'Use a nickname, not numbers.' };
    return { ok: true, name };
  }

  // Makes a profile and switches to it. The first profile adopts any diary already on this device, so nothing is lost.
  function signUp(raw, color) {
    const c = checkName(raw);
    if (!c.ok) return c;
    const all = profiles();
    if (all.length >= MAX_PROFILES) return { ok: false, why: `This device holds ${MAX_PROFILES} profiles. Remove one first.` };
    if (all.some((p) => p.name.toLowerCase() === c.name.toLowerCase())) return { ok: false, why: 'Someone here already has that nickname.' };
    const p = { id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: c.name, color: COLORS.includes(color) ? color : COLORS[all.length % COLORS.length] };
    if (!all.length) {
      const old = store.get(LEGACY);
      if (old) { store.set(`${LEGACY}:${p.id}`, old); store.del(LEGACY); }
    }
    store.set(PKEY, JSON.stringify([...all, p]));
    store.set(AKEY, p.id);
    return { ok: true, profile: p };
  }
  function switchTo(id) {
    if (!profiles().some((p) => p.id === id)) return false;
    store.set(AKEY, id);
    return true;
  }
  function remove(id) {
    const all = profiles(), left = all.filter((p) => p.id !== id);
    if (left.length === all.length) return false;
    store.del(`${LEGACY}:${id}`);
    store.set(PKEY, JSON.stringify(left));
    if (store.get(AKEY) === id) { if (left.length) store.set(AKEY, left[0].id); else store.del(AKEY); }
    return true;
  }

  // ---- the diary (of whoever is active) ----
  function load() {
    try {
      const log = JSON.parse(store.get(logKey()) || '{}');
      return log && typeof log === 'object' && !Array.isArray(log) ? log : {};
    } catch { return {}; }
  }

  // Records that an idea (like "math:add") was played through today.
  function mark(id) {
    const log = load(), today = dayKey();
    const day = log[today] || (log[today] = { ideas: {} });
    day.ideas[id] = (day.ideas[id] || 0) + 1;
    try { // minutes come from the daily time limit's own counter
      const used = JSON.parse(store.get('vl-used') || 'null');
      if (used && used.date === today) day.sec = Number(used.sec) || 0;
    } catch { /* ignore */ }
    const days = Object.keys(log).sort();
    for (const old of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete log[old];
    store.set(logKey(), JSON.stringify(log));
    return log;
  }

  // The last `n` days, oldest first, each with the ideas explored that day.
  function recent(n, now = new Date()) {
    const log = load(), out = [];
    for (let k = n - 1; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
      const key = dayKey(d), day = log[key];
      out.push({ key, date: d.getDate(), weekday: d.getDay(), ideas: day ? Object.keys(day.ideas) : [], sec: day?.sec || 0 });
    }
    return out;
  }
  const everMet = () => [...new Set(Object.values(load()).flatMap((d) => Object.keys(d.ideas || {})))];
  const clear = () => store.set(logKey(), '{}');


  // ---- keep a copy: save everyone's diary to a file, and load one back ----
  const IDEA_ID = /^[a-z0-9-]{1,24}:[a-zA-Z0-9-]{1,24}$/, DATE = /^\d{4}-\d{2}-\d{2}$/, MAX_FILE = 300000;

  // Joins two diaries. Counts take the larger side, so loading the same file twice never double-counts.
  function mergeLogs(a, b) {
    const out = {};
    for (const log of [a || {}, b || {}]) {
      for (const [date, day] of Object.entries(log)) {
        if (!day || typeof day !== 'object') continue;
        const o = out[date] || (out[date] = { ideas: {} });
        for (const [id, n] of Object.entries(day.ideas || {})) o.ideas[id] = Math.max(o.ideas[id] || 0, Number(n) || 0);
        if (day.sec) o.sec = Math.max(o.sec || 0, Number(day.sec) || 0);
      }
    }
    return out;
  }
  // Keeps only what a diary can contain: real dates, idea ids that look like ids, sensible counts.
  function cleanLog(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [date, day] of Object.entries(raw)) {
      if (!DATE.test(date) || !day || typeof day !== 'object') continue;
      const ideas = {};
      for (const [id, n] of Object.entries(day.ideas || {})) {
        const c = Math.floor(Number(n));
        if (IDEA_ID.test(id) && c >= 1) ideas[id] = Math.min(c, 1000);
      }
      if (!Object.keys(ideas).length) continue;
      out[date] = { ideas };
      const sec = Number(day.sec);
      if (sec > 0 && sec <= 86400) out[date].sec = Math.floor(sec);
    }
    return out;
  }
  const readLog = (key) => { try { const l = JSON.parse(store.get(key) || '{}'); return l && typeof l === 'object' && !Array.isArray(l) ? l : {}; } catch { return {}; } };

  function exportData() {
    const all = profiles();
    const people = all.length
      ? all.map((p) => ({ name: p.name, color: p.color, log: readLog(`${LEGACY}:${p.id}`) }))
      : [{ name: 'Me', color: COLORS[0], log: readLog(LEGACY) }];
    return { app: 'visualearn', version: 1, exported: dayKey(), people };
  }
  const exportText = () => JSON.stringify(exportData(), null, 1);

  // Loads a saved file. A person who already exists (same nickname) gets the two diaries merged; anyone new is added.
  function importText(text) {
    if (typeof text !== 'string' || !text.trim()) return { ok: false, why: 'That file is empty.' };
    if (text.length > MAX_FILE) return { ok: false, why: 'That file is too big to be a VisuaLearn file.' };
    let d;
    try { d = JSON.parse(text); } catch { return { ok: false, why: 'That does not look like a VisuaLearn file.' }; }
    if (!d || d.app !== 'visualearn' || d.version !== 1 || !Array.isArray(d.people) || !d.people.length) return { ok: false, why: 'That does not look like a VisuaLearn file.' };
    if (d.people.length > MAX_PROFILES) return { ok: false, why: `A file can hold at most ${MAX_PROFILES} people.` };
    const incoming = [];
    for (const p of d.people) {
      const c = checkName(p && p.name);
      if (!c.ok) return { ok: false, why: `One name in the file is not allowed: ${c.why}` };
      incoming.push({ name: c.name, color: p && COLORS.includes(p.color) ? p.color : null, log: cleanLog(p && p.log) });
    }
    let all = profiles(), added = 0, merged = 0;
    for (const person of incoming) {
      const have = all.find((q) => q.name.toLowerCase() === person.name.toLowerCase());
      if (have) {
        store.set(`${LEGACY}:${have.id}`, JSON.stringify(mergeLogs(readLog(`${LEGACY}:${have.id}`), person.log)));
        merged++;
        continue;
      }
      if (all.length >= MAX_PROFILES) return { ok: false, why: `This device already holds ${MAX_PROFILES} people. Remove one, then load the file again.`, added, merged };
      const p = { id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: person.name, color: person.color || COLORS[all.length % COLORS.length] };
      let log = person.log;
      if (!all.length) { // the first profile on a device also takes in any diary that was there before profiles
        const old = readLog(LEGACY);
        if (Object.keys(old).length) { log = mergeLogs(old, log); store.del(LEGACY); }
      }
      store.set(`${LEGACY}:${p.id}`, JSON.stringify(log));
      all = [...all, p];
      store.set(PKEY, JSON.stringify(all));
      added++;
    }
    if (!active() && all.length) store.set(AKEY, all[0].id);
    return { ok: true, added, merged };
  }

  globalThis.VLProgress = { mark, load, recent, everMet, clear, dayKey, profiles, active, logKey, checkName, signUp, switchTo, remove, COLORS, MAX_PROFILES, mergeLogs, cleanLog, exportData, exportText, importText };
})();
