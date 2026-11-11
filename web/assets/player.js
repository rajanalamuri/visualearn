/* VisuaLearn lesson player, shared by every lesson except sorting (which has its own player in sort.js).
   A lesson hands the player:
     algos:  { key: { name, blurb, facts: [[label, value]], code: [lines], offline: { title, need, time, steps, think } } }
     record(key)        -> frames: [{ line, note, q }]   q = { text, options, answer, either?, why } or null
     setup(key, frames) -> builds the stage for a fresh run (optional)
     render(frame, key) -> draws one frame on the stage
     stats(frame, key)  -> [[label, value]]
   mount() returns { restart } so the lesson's own controls can rebuild the frames.
   Like sort.js, every step is recorded up front, so stepping back is free and Predict mode can ask before it shows. */
(() => {
  'use strict';
  const DELAYS = [900, 450, 220, 100, 40];

  function mount(lesson) {
    const $ = (id) => document.getElementById(id);
    const els = {
      algos: $('algos'), note: $('note'), code: $('code'), stats: $('stats'), scrub: $('scrub'),
      play: $('b-play'), fwd: $('b-fwd'), speed: $('speed'), predict: $('predict'),
      quiz: $('quiz'), quizQ: $('quiz-q'), quizOpts: $('quiz-opts'), quizFb: $('quiz-fb'), quizSkip: $('quiz-skip'),
      done: $('done'), doneText: $('done-text'),
      name: $('algo-name'), blurb: $('algo-blurb'), facts: $('algo-facts'),
      offTitle: $('off-title'), offNeed: $('off-need'), offTime: $('off-time'), offSteps: $('off-steps'), offThink: $('off-think'), offAlgo: $('off-algo'),
    };
    const keys = Object.keys(lesson.algos);
    const fromHash = location.hash.slice(1);
    const state = {
      algo: keys.includes(fromHash) ? fromHash : keys[0],
      frames: [], i: 0, timer: null, predict: els.predict.checked, pending: -1, resume: false,
      answered: new Map(), right: 0, asked: 0,
    };

    const fillList = (el, items) => {
      el.innerHTML = '';
      for (const t of items) { const li = document.createElement('li'); li.textContent = t; el.appendChild(li); }
    };

    function buildAlgoButtons() {
      els.algos.innerHTML = '';
      for (const key of keys) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = lesson.algos[key].name;
        b.dataset.algo = key;
        b.addEventListener('click', () => {
          state.algo = key;
          history.replaceState(null, '', '#' + key);
          prepare();
        });
        els.algos.appendChild(b);
      }
    }

    function prepare() {
      stop();
      const al = lesson.algos[state.algo];
      state.frames = lesson.record(state.algo);
      state.i = 0;
      state.pending = -1;
      state.answered = new Map();
      state.right = 0;
      state.asked = 0;
      state.logged = false;
      els.scrub.max = String(state.frames.length - 1);
      fillList(els.code, al.code);
      els.name.textContent = al.name;
      els.blurb.textContent = al.blurb;
      els.facts.innerHTML = '';
      for (const [label, value] of al.facts) {
        const div = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = value;
        div.append(dt, dd);
        els.facts.appendChild(div);
      }
      for (const b of els.algos.children) b.setAttribute('aria-pressed', String(b.dataset.algo === state.algo));
      const o = al.offline;
      els.offAlgo.textContent = al.name;
      els.offTitle.textContent = o.title;
      els.offNeed.textContent = o.need;
      els.offTime.textContent = o.time;
      els.offThink.textContent = o.think;
      fillList(els.offSteps, o.steps);
      if (lesson.setup) lesson.setup(state.algo, state.frames);
      render();
    }

    function renderStats(f) {
      const rows = [
        ['Step', `${state.i} / ${state.frames.length - 1}`],
        ...lesson.stats(f, state.algo),
        ['Guesses', state.asked ? `${state.right} / ${state.asked}` : '–'],
      ];
      if (els.stats.children.length !== rows.length) {
        els.stats.innerHTML = '';
        for (let k = 0; k < rows.length; k++) {
          const div = document.createElement('div');
          div.append(document.createElement('dt'), document.createElement('dd'));
          els.stats.appendChild(div);
        }
      }
      rows.forEach(([label, value], k) => {
        const div = els.stats.children[k];
        div.firstChild.textContent = label;
        div.lastChild.textContent = String(value);
      });
    }

    function renderQuiz(f) {
      const open = state.pending === state.i;
      const result = state.answered.get(state.i);
      els.quiz.hidden = !(state.predict && f.q && (open || result));
      els.note.hidden = !els.quiz.hidden;
      if (els.quiz.hidden) return;
      els.quizQ.textContent = f.q.text;
      els.quizOpts.innerHTML = '';
      f.q.options.forEach((label, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn opt';
        b.textContent = label;
        b.disabled = !open;
        if (result && (k === f.q.answer || f.q.either)) b.classList.add('is-answer');
        b.addEventListener('click', () => answer(k));
        els.quizOpts.appendChild(b);
      });
      els.quizSkip.hidden = !open;
      if (result) {
        els.quizFb.textContent = result === 'right' ? `Right! ${f.q.why}` : result === 'skip' ? f.q.why : `Not quite. ${f.q.why}`;
        els.quizFb.className = `fb ${result}`;
      } else {
        els.quizFb.textContent = 'Make a guess, then the lesson will show you.';
        els.quizFb.className = 'fb';
      }
    }

    function render() {
      const f = state.frames[state.i];
      lesson.render(f, state.algo);
      [...els.code.children].forEach((li, k) => li.classList.toggle('on', k === f.line));
      els.note.textContent = f.note;
      renderStats(f);
      els.scrub.value = String(state.i);
      els.fwd.disabled = state.pending === state.i;
      renderQuiz(f);
      const last = state.i === state.frames.length - 1 && state.frames.length > 1;
      els.done.hidden = !last;
      if (last && !state.logged) { // note it in the on-device diary, once per run
        state.logged = true;
        const page = location.pathname.split('/').filter(Boolean).pop();
        globalThis.VLProgress?.mark(`${page}:${state.algo}`);
      }
      if (last) {
        els.doneText.textContent = (state.asked ? `You guessed ${state.right} of ${state.asked} right. ` : '') +
          'Now try it for real, away from the screen.';
      }
    }

    // Moves to frame i. Returns false if Predict mode stopped there to ask a question.
    function go(i) {
      state.i = Math.max(0, Math.min(state.frames.length - 1, i));
      const f = state.frames[state.i];
      const ask = state.predict && f.q && !state.answered.has(state.i);
      state.pending = ask ? state.i : -1;
      render();
      if (ask) {
        const first = els.quizOpts.querySelector('button');
        const active = document.activeElement;
        if (first && active && (active === document.body || active.closest('.transport'))) first.focus({ preventScroll: true });
      }
      return !ask;
    }

    function answer(k) {
      if (state.pending !== state.i) return;
      const q = state.frames[state.i].q;
      let result = 'skip';
      if (k >= 0) {
        state.asked++;
        const right = k === q.answer || q.either;
        if (right) state.right++;
        result = right ? 'right' : 'wrong';
      }
      state.answered.set(state.i, result);
      state.pending = -1;
      render();
      if (state.resume) {
        state.resume = false;
        setPlayIcon(true);
        state.timer = setTimeout(tick, result === 'wrong' ? 2200 : 1200);
      }
    }

    function setPlayIcon(playing) {
      els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      els.play.querySelector('svg').innerHTML = playing
        ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'
        : '<path d="M7 5v14l12-7z"/>';
    }

    function tick() {
      state.timer = null;
      if (state.i >= state.frames.length - 1) { stop(); return; }
      if (!go(state.i + 1)) { state.resume = true; setPlayIcon(false); return; }
      state.timer = setTimeout(tick, DELAYS[Number(els.speed.value) - 1]);
    }
    function play() {
      if (state.timer) return;
      if (state.pending === state.i) { state.resume = true; return; }
      if (state.i >= state.frames.length - 1) go(0);
      setPlayIcon(true);
      state.timer = setTimeout(tick, 0);
    }
    function stop() {
      clearTimeout(state.timer);
      state.timer = null;
      state.resume = false;
      setPlayIcon(false);
    }
    function toggle() {
      if (state.pending === state.i) {
        state.resume = true;
        els.quizOpts.querySelector('button')?.focus({ preventScroll: true });
        return;
      }
      if (state.timer) stop(); else play();
    }
    const step = (d) => { stop(); if (d > 0 && state.pending === state.i) return; go(state.i + d); };

    els.play.addEventListener('click', toggle);
    $('b-back').addEventListener('click', () => step(-1));
    els.fwd.addEventListener('click', () => step(1));
    $('b-reset').addEventListener('click', () => { stop(); go(0); });
    els.quizSkip.addEventListener('click', () => answer(-1));
    els.predict.addEventListener('change', () => {
      state.predict = els.predict.checked;
      if (!state.predict && state.pending === state.i) {
        state.pending = -1;
        if (state.resume) { state.resume = false; play(); }
      }
      render();
    });
    els.scrub.addEventListener('input', () => {
      stop();
      state.i = Number(els.scrub.value); // scrubbing is for looking around, so it never stops to ask
      state.pending = -1;
      render();
    });
    $('b-print').addEventListener('click', () => window.print());
    document.addEventListener('vl:rest', stop);
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && ((t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox') || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (document.body.classList.contains('resting')) return;
      const f = state.frames[state.i];
      const n = Number(e.key);
      if (state.pending === state.i && Number.isInteger(n) && n >= 1 && n <= f.q.options.length) { answer(n - 1); return; }
      if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight' && t.type !== 'range') step(1);
      else if (e.key === 'ArrowLeft' && t.type !== 'range') step(-1);
      else if (e.key === 'Home') { stop(); go(0); }
    });

    buildAlgoButtons();
    prepare();
    return { restart: prepare, get algo() { return state.algo; } };
  }

  globalThis.VLPlayer = { mount };
})();
