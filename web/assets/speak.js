/* Read aloud: the page's own voice (the device's built-in speech) reads each step and each question.
   Nothing is recorded and nothing is sent anywhere. Off until a grown-up or child turns it on. */
(() => {
  'use strict';

  // Turns on-screen text into something that sounds right when spoken.
  function clean(text) {
    return String(text)
      .replace(/O\(1\)/g, 'order one').replace(/O\(n²\)/g, 'order n squared').replace(/O\(n log n\)/g, 'order n log n').replace(/O\(([^)]*)\)/g, 'order $1')
      .replace(/log₂/g, 'log base two').replace(/²/g, ' squared').replace(/₂/g, ' two')
      .replace(/\s*→\s*/g, ' to ').replace(/←/g, ' gets ').replace(/\s*×\s*/g, ' times ').replace(/\s*÷\s*/g, ' divided by ')
      .replace(/\s*[−–]\s*(?=\d)/g, ' minus ').replace(/\s\+\s/g, ' plus ').replace(/≤/g, ' at most ').replace(/≥/g, ' at least ')
      .replace(/…/g, ' to ').replace(/\s{2,}/g, ' ').trim();
  }
  globalThis.VLSpeak = { clean };
  if (typeof document === 'undefined' || !('speechSynthesis' in globalThis)) return;

  const $ = (id) => document.getElementById(id);
  const knobs = document.querySelector('.knobs'), note = $('note'), quiz = $('quiz');
  if (!knobs || !note || !quiz) return;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };

  const label = document.createElement('label');
  label.className = 'switch';
  label.innerHTML = '<input type="checkbox" id="speak"> <span>Read aloud</span>';
  knobs.insertBefore(label, knobs.firstChild);
  const box = label.firstElementChild;
  box.checked = store.get('vl-speak') === '1';

  const synth = speechSynthesis;
  let timer = null;
  const stop = () => { clearTimeout(timer); synth.cancel(); };
  function say(text) {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = 'en-US'; u.rate = 0.95; u.pitch = 1.05;
    synth.speak(u);
  }
  function current() {
    if (!quiz.hidden) {
      const fb = $('quiz-fb').textContent;
      if (fb && !/^Make a guess/.test(fb)) return fb;
      const opts = [...$('quiz-opts').children].map((b) => b.textContent).join('. Or, ');
      return `${$('quiz-q').textContent} ${opts}`;
    }
    return note.textContent;
  }
  function soon() {
    clearTimeout(timer);
    if (!box.checked) return;
    timer = setTimeout(() => { const t = current(); if (t) say(t); }, 450); // wait for the text to settle while playing
  }

  new MutationObserver(soon).observe(note.closest('.stage-head') || note.parentNode, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  box.addEventListener('change', () => { store.set('vl-speak', box.checked ? '1' : '0'); if (box.checked) soon(); else stop(); });
  document.addEventListener('vl:rest', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  addEventListener('pagehide', stop);
})();
