/* VisuaLearn daily screen-time nudge.
   Counts minutes while the page is visible. At the limit it shows a "time to go offline" screen.
   Nothing leaves the device: settings and today's minutes live in localStorage. */
(() => {
  'use strict';
  const KEY_LIMIT = 'vl-limit-min';
  const KEY_USED = 'vl-used';
  const DEFAULT_MIN = 15;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: count for this visit only */ } },
  };
  const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

  function loadUsed() {
    try {
      const u = JSON.parse(store.get(KEY_USED) || 'null');
      if (u && u.date === today()) return { date: u.date, sec: Number(u.sec) || 0, extra: Number(u.extra) || 0 };
    } catch { /* ignore */ }
    return { date: today(), sec: 0, extra: 0 };
  }

  let limitMin = Number(store.get(KEY_LIMIT) ?? DEFAULT_MIN);
  if (!Number.isFinite(limitMin) || limitMin < 0) limitMin = DEFAULT_MIN;
  let used = loadUsed();
  let resting = false;

  const chip = document.getElementById('timer');
  const rest = document.getElementById('rest');
  const select = document.getElementById('limit-min');
  const more = document.getElementById('rest-more');
  const bye = document.getElementById('rest-bye');
  const restBody = document.getElementById('rest-body');
  const restDone = document.getElementById('rest-done');

  const allowedSec = () => (limitMin + used.extra) * 60;

  function fmt(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function paint() {
    if (!chip) return;
    if (limitMin === 0) { chip.hidden = true; return; }
    chip.hidden = false;
    const left = allowedSec() - used.sec;
    chip.textContent = `${fmt(left)} left today`;
    chip.classList.toggle('low', left <= 120);
  }

  function openRest() {
    if (resting || !rest) return;
    resting = true;
    document.dispatchEvent(new CustomEvent('vl:rest'));
    document.body.classList.add('resting');
    restBody.hidden = false;
    restDone.hidden = true;
    more.hidden = used.extra >= 10; // two top-ups per day at most
    rest.hidden = false;
    rest.querySelector('button').focus();
  }
  function closeRest() {
    resting = false;
    document.body.classList.remove('resting');
    rest.hidden = true;
  }

  setInterval(() => {
    if (document.visibilityState !== 'visible' || resting || limitMin === 0) return;
    if (used.date !== today()) used = { date: today(), sec: 0, extra: 0 };
    used.sec += 1;
    if (used.sec % 5 === 0) store.set(KEY_USED, JSON.stringify(used));
    paint();
    if (used.sec >= allowedSec()) openRest();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.set(KEY_USED, JSON.stringify(used));
  });

  if (select) {
    select.value = String(limitMin);
    if (select.value !== String(limitMin)) select.value = String(DEFAULT_MIN);
    select.addEventListener('change', () => {
      limitMin = Number(select.value);
      store.set(KEY_LIMIT, String(limitMin));
      paint();
      if (limitMin !== 0 && used.sec < allowedSec()) closeRest();
    });
  }
  more?.addEventListener('click', () => {
    used.extra += 5;
    store.set(KEY_USED, JSON.stringify(used));
    closeRest();
    paint();
  });
  bye?.addEventListener('click', () => {
    restBody.hidden = true;
    restDone.hidden = false;
  });
  const printBtn = document.getElementById('rest-print');
  if (printBtn && !document.getElementById('offline')) printBtn.hidden = true; // home page: nothing to print
  printBtn?.addEventListener('click', () => window.print());

  paint();
  if (limitMin !== 0 && used.sec >= allowedSec()) openRest();
})();
