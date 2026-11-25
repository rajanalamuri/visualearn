/* Parents only: sign in (Google, or an emailed link) to keep the on-device diary in step across devices.
   Children never sign in. The only thing stored is the diary (which idea, which day), under the parent's own id.
   Firebase is loaded from Google only on this page, only after the grown-up check, and only if firebase-config.js is filled in.
   The grown-up check is a deterrent, not a lock: it keeps young children out, and slows down guessing. */
(() => {
  'use strict';
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const GATE_TRIES = 3, GATE_LOCK_MS = 60000, GATE_OK_MS = 20 * 60000;

  // Joins two diaries. Counts take the larger side, so syncing twice never double-counts.
  function merge(a, b) {
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

  // 0 to 999 in English words ("three hundred and forty-seven").
  const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function words(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
    return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${words(n % 100)}` : ''}`;
  }

  // Two kinds of question, chosen at random: a sum a young child cannot do in their head, or a long number to read and type.
  function gate(rng = Math.random, lang = 'en') {
    if (lang !== 'en' || rng() < 0.5) { // number words are English, so every other language gets the sum
      const a = 13 + Math.floor(rng() * 7), b = 12 + Math.floor(rng() * 8), c = 11 + Math.floor(rng() * 39);
      return { kind: 'sum', text: `What is (${a} × ${b}) + ${c}?`, answer: a * b + c };
    }
    const n = 101 + Math.floor(rng() * 899);
    return { kind: 'words', text: `Type this number using digits: ${words(n)}.`, answer: n };
  }

  // Wrong answers slow things down: three misses lock the check for a minute. Passing lasts the visit (20 minutes).
  function gateStatus(st, now) {
    const s = st || {};
    if (s.okAt && now - s.okAt < GATE_OK_MS) return { passed: true, locked: false, wait: 0 };
    if (s.lockUntil && now < s.lockUntil) return { passed: false, locked: true, wait: Math.ceil((s.lockUntil - now) / 1000) };
    return { passed: false, locked: false, wait: 0 };
  }
  function afterAnswer(st, right, now) {
    const s = { fails: 0, ...(st || {}) };
    if (right) return { fails: 0, okAt: now };
    s.fails += 1;
    if (s.fails >= GATE_TRIES) return { fails: 0, lockUntil: now + GATE_LOCK_MS };
    return { fails: s.fails };
  }
  const isEmail = (t) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@.]{2,}$/.test(String(t || '').trim()) && String(t).trim().length <= 254;

  globalThis.VLParents = { merge, gate, words, gateStatus, afterAnswer, isEmail };
  if (typeof document === 'undefined') return;

  const $ = (id) => document.getElementById(id);
  const cfg = globalThis.VL_FIREBASE || {};
  const ready = !!(cfg.apiKey && cfg.projectId && cfg.authDomain && cfg.appId);
  const say = (t) => { $('p-status').textContent = t; };
  const ss = {
    get() { try { return JSON.parse(sessionStorage.getItem('vl-gate') || '{}'); } catch { return {}; } },
    set(v) { try { sessionStorage.setItem('vl-gate', JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const pageLang = () => { try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('vl-lang') || String(navigator.language || 'en').slice(0, 2); } catch { return 'en'; } };
  let g = gate(Math.random, pageLang()), tick = null;
  const ask = () => { $('p-q').textContent = g.text; $('p-a').value = ''; };
  ask();

  let fb = null; // { auth, db, A, F }
  async function load() {
    if (fb) return fb;
    const [app, A, F] = await Promise.all([import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`), import(`${SDK}firebase-firestore.js`)]);
    const a = app.initializeApp(cfg);
    fb = { A, F, auth: A.getAuth(a), db: F.getFirestore(a) };
    return fb;
  }
  const logKey = () => (globalThis.VLProgress ? VLProgress.logKey() : 'vl-log');
  const localLog = () => { try { return JSON.parse(localStorage.getItem(logKey()) || '{}') || {}; } catch { return {}; } };
  const ref = () => fb.F.doc(fb.db, 'parents', fb.auth.currentUser.uid);

  function show(user) {
    $('p-in').hidden = !user;
    $('p-out').hidden = !!user;
    $('p-who').textContent = user ? user.email || 'Signed in' : '';
  }

  async function sync() {
    say('Syncing…');
    try {
      const snap = await fb.F.getDoc(ref());
      const remote = snap.exists() ? JSON.parse(snap.data().log || '{}') : {};
      const merged = merge(localLog(), remote);
      try { localStorage.setItem(logKey(), JSON.stringify(merged)); } catch { /* private mode */ }
      await fb.F.setDoc(ref(), { log: JSON.stringify(merged), updated: Date.now() });
      say('Up to date on this device.');
    } catch { say('Could not sync. Check the connection and try again.'); }
  }

  // After the grown-up check: load Firebase, finish an emailed link if this is one, and show the sign-in choices.
  async function proceed() {
    $('p-gate').hidden = true;
    if (!ready) { $('p-off').hidden = false; say(''); return; }
    say('Loading…');
    try {
      await load();
      $('p-out').hidden = false;          // never make the buttons wait on the checks below
      say('');
      fb.A.getRedirectResult(fb.auth).catch(() => { /* no redirect to finish */ });
      fb.A.onAuthStateChanged(fb.auth, (u) => { show(u); say(''); if (u) sync(); });
      if (fb.A.isSignInWithEmailLink(fb.auth, location.href)) {
        let email = '';
        try { email = localStorage.getItem('vl-signin-email') || ''; } catch { /* ignore */ }
        if (!email) email = (prompt('Type the email address you used, to finish signing in') || '').trim();
        if (isEmail(email)) {
          say('Signing in…');
          try { await fb.A.signInWithEmailLink(fb.auth, email, location.href); try { localStorage.removeItem('vl-signin-email'); } catch { /* ignore */ } history.replaceState(null, '', location.pathname); }
          catch { say('That link did not work. It may have expired. Ask for a new one.'); }
        }
      }
    } catch { say('Could not reach the sign-in service.'); $('p-gate').hidden = false; }
  }

  function lockUi() {
    const st = gateStatus(ss.get(), Date.now()), btn = $('p-gate').querySelector('button');
    btn.disabled = st.locked; $('p-a').disabled = st.locked;
    if (st.locked) {
      say(`Too many tries. Please wait ${st.wait} second${st.wait === 1 ? '' : 's'}.`);
      btn.dataset.wasLocked = '1';
      clearTimeout(tick); tick = setTimeout(lockUi, 1000);
    } else if (btn.dataset.wasLocked) { say(''); delete btn.dataset.wasLocked; g = gate(Math.random, pageLang()); ask(); }
  }

  $('p-gate').addEventListener('submit', (e) => {
    e.preventDefault();
    const now = Date.now(), st = gateStatus(ss.get(), now);
    if (st.locked) { lockUi(); return; }
    const right = Number($('p-a').value.trim()) === g.answer;
    ss.set(afterAnswer(ss.get(), right, now));
    if (right) { proceed(); return; }
    g = gate(Math.random, pageLang()); ask();
    if (gateStatus(ss.get(), Date.now()).locked) lockUi(); else say('Not quite. This part is for grown-ups.');
  });

  $('p-google').addEventListener('click', async () => {
    const provider = new fb.A.GoogleAuthProvider();
    try {
      if (matchMedia('(display-mode: standalone)').matches) await fb.A.signInWithRedirect(fb.auth, provider);
      else await fb.A.signInWithPopup(fb.auth, provider);
    } catch (err) {
      if (err && err.code === 'auth/popup-blocked') await fb.A.signInWithRedirect(fb.auth, provider);
      else say('Sign-in did not finish.');
    }
  });

  $('p-email-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('p-email').value.trim();
    if (!isEmail(email)) { say('That does not look like an email address.'); $('p-email').focus(); return; }
    say('Sending…');
    try {
      await fb.A.sendSignInLinkToEmail(fb.auth, email, { url: `${location.origin}/parents/`, handleCodeInApp: true });
      try { localStorage.setItem('vl-signin-email', email); } catch { /* ignore */ }
      say('Check your email and open the link on this device. It is valid for one hour.');
    } catch (err) {
      say(err && err.code === 'auth/operation-not-allowed' ? 'Email sign-in is not switched on for this site yet. Try Google instead.' : 'Could not send the link. Check the address and try again.');
    }
  });

  $('p-sync').addEventListener('click', sync);
  $('p-signout').addEventListener('click', async () => { await fb.A.signOut(fb.auth); say('Signed out. The diary stays on this device.'); });
  $('p-delete').addEventListener('click', async () => {
    if (!confirm('Delete the synced diary from the cloud? The diary on this device stays.')) return;
    try { await fb.F.deleteDoc(ref()); say('Cloud copy deleted.'); } catch { say('Could not delete. Try again.'); }
  });

  // A grown-up who already passed the check this visit (or is coming back from an emailed link) is not asked again.
  if (gateStatus(ss.get(), Date.now()).passed) proceed(); else lockUi();
})();
