/* VisuaLearn progress: a quiet diary of which ideas were explored on which day.
   It lives in this browser's localStorage and nowhere else. No account, no server.
   There are no streaks or scores on purpose: it shows what happened, it doesn't push for more. */
(() => {
  'use strict';
  const KEY = 'vl-log', KEEP_DAYS = 120;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: nothing is kept */ } },
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // YYYY-MM-DD, local time

  function load() {
    try {
      const log = JSON.parse(store.get(KEY) || '{}');
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
    store.set(KEY, JSON.stringify(log));
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
  const clear = () => store.set(KEY, '{}');

  globalThis.VLProgress = { mark, load, recent, everMet, clear, dayKey };
})();
