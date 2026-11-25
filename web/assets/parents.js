/* Parents only: sign in with Google to keep the on-device diary in step across devices.
   Children never sign in. The only thing stored is the diary (which idea, which day), under the parent's own id.
   Firebase is loaded from Google only on this page, only after the grown-up check, and only if firebase-config.js is filled in. */
(() => {
  'use strict';
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';

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

  // A sum a young child is unlikely to do on the spot, but any adult can.
  function gate(rng = Math.random) {
    const a = 6 + Math.floor(rng() * 7), b = 6 + Math.floor(rng() * 7);
    return { text: `What is ${a} × ${b}?`, answer: a * b };
  }

  globalThis.VLParents = { merge, gate };
  if (typeof document === 'undefined') return;

  const $ = (id) => document.getElementById(id);
  const cfg = globalThis.VL_FIREBASE || {};
  const ready = !!(cfg.apiKey && cfg.projectId && cfg.authDomain && cfg.appId);
  const say = (t) => { $('p-status').textContent = t; };
  let g = gate();
  $('p-q').textContent = g.text;

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

  $('p-gate').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (Number($('p-a').value) !== g.answer) {
      say('Not quite. This part is for grown-ups.');
      g = gate(); $('p-q').textContent = g.text; $('p-a').value = '';
      return;
    }
    $('p-gate').hidden = true;
    if (!ready) { $('p-off').hidden = false; say(''); return; }
    say('Loading…');
    try {
      await load();
      await fb.A.getRedirectResult(fb.auth).catch(() => {});
      fb.A.onAuthStateChanged(fb.auth, (u) => { show(u); say(''); if (u) sync(); });
      $('p-out').hidden = false;
    } catch { say('Could not reach the sign-in service.'); $('p-gate').hidden = false; }
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
  $('p-sync').addEventListener('click', sync);
  $('p-signout').addEventListener('click', async () => { await fb.A.signOut(fb.auth); say('Signed out. The diary stays on this device.'); });
  $('p-delete').addEventListener('click', async () => {
    if (!confirm('Delete the synced diary from the cloud? The diary on this device stays.')) return;
    try { await fb.F.deleteDoc(ref()); say('Cloud copy deleted.'); } catch { say('Could not delete. Try again.'); }
  });
})();
