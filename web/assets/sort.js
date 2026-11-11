/* VisuaLearn sorting visualiser.
   Each algorithm runs once, up front, on a copy of the array and records a frame after every step.
   The player only renders frames, so stepping backwards is free.
   Comparison frames carry a question (q) so Predict mode can ask before showing the answer. */
(() => {
  'use strict';

  const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
  const yn = (yes, text, whyYes, whyNo) => ({ text, options: ['Yes', 'No'], answer: yes ? 0 : 1, why: yes ? whyYes : whyNo });

  // ---------- algorithms ----------
  const ALGOS = {
    bubble: {
      name: 'Bubble sort',
      blurb: 'Walk along the list and swap any two neighbours that are in the wrong order. Each walk carries the biggest number left to the end, like a bubble rising.',
      cx: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes' },
      code: [
        'for each pass i = 0, 1, …',
        '  swapped ← false',
        '  for j = 0 … n−2−i',
        '    if a[j] > a[j+1]',
        '      swap a[j], a[j+1]; swapped ← true',
        '  a[n−1−i] is in place',
        '  if not swapped: stop',
      ],
      offline: {
        title: 'The bubble line-up',
        need: '4 to 8 people, or 8 playing cards',
        time: '10 minutes',
        steps: [
          'Stand in a line in any order.',
          'Start at the left end. Look at the first two people. If the taller one is on the left, they swap places.',
          'Take one step right and check the next two. Keep going to the end of the line.',
          'The tallest person is now at the right end. They are sorted, so they can sit down.',
          'Start again from the left. You are done when you walk the whole line and nobody swaps.',
        ],
        think: 'How many times did the shortest person move? Why do small values travel left so slowly?',
      },
      run(x) {
        const { a, n } = x;
        for (let i = 0; i < n - 1; i++) {
          let swapped = false;
          x.rec({}, 0, `Pass ${i + 1}: carry the biggest unsorted number to the right.`);
          for (let j = 0; j < n - 1 - i; j++) {
            x.c++;
            x.rec({ [j]: 'cmp', [j + 1]: 'cmp' }, 3, `Is ${a[j]} bigger than ${a[j + 1]}?`, null,
              yn(a[j] > a[j + 1], `Will ${a[j]} and ${a[j + 1]} swap places?`,
                `${a[j]} is bigger, so it moves right.`, `${a[j]} isn't bigger, so they stay put.`));
            if (a[j] > a[j + 1]) {
              swap(a, j, j + 1); x.w += 2; swapped = true;
              x.rec({ [j]: 'swap', [j + 1]: 'swap' }, 4, `Yes, so swap them. ${a[j + 1]} moves right.`);
            }
          }
          x.sorted.add(n - 1 - i);
          x.rec({}, 5, `${a[n - 1 - i]} has reached its final place.`);
          if (!swapped) {
            x.rec({}, 6, 'No swaps in this pass, so everything left is already in order.');
            return;
          }
        }
      },
    },

    selection: {
      name: 'Selection sort',
      blurb: 'Look through the unsorted numbers, find the smallest, and move it to the front. Then do it again with what is left.',
      cx: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'No' },
      code: [
        'for i = 0 … n−2',
        '  min ← i',
        '  for j = i+1 … n−1',
        '    if a[j] < a[min]: min ← j',
        '  swap a[i], a[min]',
        '  a[i] is in place',
      ],
      offline: {
        title: 'Find the smallest',
        need: '8 playing cards (ace counts as 1)',
        time: '10 minutes',
        steps: [
          'Lay the cards face up in a row, all mixed up.',
          'Touch each card one at a time and find the smallest.',
          'Move it down to start a new row underneath.',
          'Do the same with the cards that are left, until the top row is empty.',
        ],
        think: 'Count every card you touch. With 8 cards it is always 28, however they start. Can you work out why?',
      },
      run(x) {
        const { a, n } = x;
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          x.rec({ [i]: 'key' }, 1, `Start by guessing ${a[i]} is the smallest of what's left.`, [i, n - 1]);
          for (let j = i + 1; j < n; j++) {
            x.c++;
            x.rec({ [min]: 'key', [j]: 'cmp' }, 3, `Is ${a[j]} smaller than ${a[min]}?`, [i, n - 1],
              yn(a[j] < a[min], `Is ${a[j]} smaller than ${a[min]}?`,
                `${a[j]} is the new smallest.`, `${a[min]} is still the smallest.`));
            if (a[j] < a[min]) {
              min = j;
              x.rec({ [min]: 'key' }, 3, `Yes. ${a[min]} is the new smallest.`, [i, n - 1]);
            }
          }
          if (min !== i) {
            swap(a, i, min); x.w += 2;
            x.rec({ [i]: 'swap', [min]: 'swap' }, 4, `Swap ${a[i]} to the front of the unsorted part.`, [i, n - 1]);
          } else {
            x.rec({ [i]: 'key' }, 4, `${a[i]} is already at the front. No swap needed.`, [i, n - 1]);
          }
          x.sorted.add(i);
          x.rec({}, 5, `${a[i]} is in its final place.`);
        }
      },
    },

    insertion: {
      name: 'Insertion sort',
      blurb: 'Keep a sorted part on the left. Take the next number and slide it left until it fits, the way most people sort a hand of cards.',
      cx: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes' },
      code: [
        'for i = 1 … n−1',
        '  key ← a[i]',
        '  while left neighbour > key',
        '    shift neighbour right; key moves left',
        '  key is placed',
      ],
      offline: {
        title: 'Sort your hand',
        need: '8 playing cards, face down in a pile',
        time: '10 minutes',
        steps: [
          'Pick up one card. A hand of one card is already sorted.',
          'Pick up the next card and slide it into the right place in your hand.',
          'Keep going, one card at a time, until the pile is gone.',
          'Now deal the cards out already in order and do it again. Notice how much faster it is.',
        ],
        think: 'Why does insertion sort get so quick when the cards are nearly in order already?',
      },
      run(x) {
        const { a, n } = x;
        for (let i = 1; i < n; i++) {
          const key = a[i];
          let j = i;
          x.rec({ [i]: 'key' }, 1, `Take ${key} and slide it into the sorted part on its left.`, [0, i]);
          while (j > 0) {
            x.c++;
            x.rec({ [j - 1]: 'cmp', [j]: 'key' }, 2, `Is ${a[j - 1]} bigger than ${key}?`, [0, i],
              yn(a[j - 1] > key, `Will ${key} slide left past ${a[j - 1]}?`,
                `${a[j - 1]} is bigger, so ${key} slides past it.`, `${a[j - 1]} isn't bigger, so ${key} stops here.`));
            if (a[j - 1] <= key) break;
            swap(a, j - 1, j); x.w++; j--;
            x.rec({ [j]: 'key', [j + 1]: 'swap' }, 3, `Yes. Shift ${a[j + 1]} right and move ${key} left.`, [0, i]);
          }
          x.rec({ [j]: 'key' }, 4, `${key} fits at position ${j}.`, [0, i]);
        }
      },
    },

    merge: {
      name: 'Merge sort',
      blurb: 'Split the list in half again and again until every piece has one number. Then merge the pieces back together in order.',
      cx: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: 'Yes' },
      code: [
        'mergeSort(lo, hi)',
        '  if lo ≥ hi: return',
        '  mid ← ⌊(lo + hi) / 2⌋',
        '  mergeSort(lo, mid); mergeSort(mid+1, hi)',
        '  while both halves have items',
        '    write the smaller front item',
        '  copy any leftovers',
      ],
      offline: {
        title: 'Split and merge',
        need: '8 playing cards and a table',
        time: '15 minutes',
        steps: [
          'Split the cards into 2 piles of 4. Split those into 4 piles of 2. Split again into 8 single cards.',
          'Merge the single cards in pairs, smaller card on top.',
          'Merge two pairs into a sorted pile of 4. Only look at the top card of each pile and take the smaller one.',
          'Merge the two piles of 4 into one sorted pile of 8.',
        ],
        think: 'When you merge, you only ever compare the top two cards. Why is that enough?',
      },
      run(x) {
        const { a, n } = x;
        const ms = (lo, hi) => {
          if (lo >= hi) return;
          const mid = (lo + hi) >> 1;
          x.rec({}, 2, `Split positions ${lo}–${hi} into ${lo}–${mid} and ${mid + 1}–${hi}.`, [lo, hi]);
          ms(lo, mid);
          ms(mid + 1, hi);
          x.rec({}, 3, `Both halves of ${lo}–${hi} are sorted. Merge them.`, [lo, hi]);
          const L = a.slice(lo, mid + 1), R = a.slice(mid + 1, hi + 1);
          let i = 0, j = 0, k = lo;
          const final = lo === 0 && hi === n - 1;
          const put = (v, line, note) => {
            a[k] = v; x.w++;
            if (final) x.sorted.add(k);
            x.rec({ [k]: 'swap' }, line, note, [lo, hi]);
            k++;
          };
          while (i < L.length && j < R.length) {
            x.c++;
            const l = L[i], r = R[j];
            x.rec({ [k]: 'cmp' }, 4, `Compare the fronts: ${l} (left) and ${r} (right).`, [lo, hi], {
              text: `Which number goes next: ${l} from the left, or ${r} from the right?`,
              options: [`${l} (left)`, `${r} (right)`],
              answer: l <= r ? 0 : 1,
              either: l === r,
              why: l === r ? `They're equal. Merge sort takes the left one first.` : `${Math.min(l, r)} is smaller, so it goes first.`,
            });
            if (l <= r) put(L[i++], 5, `${l} is smaller or equal. Write it at position ${k}.`);
            else put(R[j++], 5, `${r} is smaller. Write it at position ${k}.`);
          }
          while (i < L.length) put(L[i++], 6, `Copy leftover ${L[i - 1]} from the left half.`);
          while (j < R.length) put(R[j++], 6, `Copy leftover ${R[j - 1]} from the right half.`);
        };
        ms(0, n - 1);
      },
    },

    quick: {
      name: 'Quick sort',
      blurb: 'Pick one number as the pivot. Put everything smaller on its left, and the pivot lands in its final spot. Then do the same on each side.',
      cx: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: 'No' },
      code: [
        'quickSort(lo, hi)',
        '  if lo ≥ hi: return',
        '  pivot ← a[hi]; i ← lo',
        '  for j = lo … hi−1',
        '    if a[j] < pivot: swap a[i], a[j]; i ← i+1',
        '  swap a[i], a[hi]    // pivot placed',
        '  quickSort(lo, i−1); quickSort(i+1, hi)',
      ],
      offline: {
        title: 'The pivot game',
        need: '8 to 10 playing cards',
        time: '10 minutes',
        steps: [
          'Mix the cards and pick the last one as the pivot. Put it in the middle of the table.',
          'Every card smaller than the pivot goes in a pile on its left. Every other card goes on its right.',
          'The pivot is now in its final place. Leave it there.',
          'Play the same game with the left pile, then the right pile, until every pile has one card.',
        ],
        think: 'What happens if the pivot is always the biggest card? Try it, and count how many times you compare.',
      },
      run(x) {
        const { a } = x;
        const qs = (lo, hi) => {
          if (lo > hi) return;
          if (lo === hi) {
            x.sorted.add(lo);
            x.rec({}, 1, `${a[lo]} is on its own, so it's already in place.`, [lo, hi]);
            return;
          }
          const p = a[hi];
          let i = lo;
          x.rec({ [hi]: 'pivot' }, 2, `The pivot is ${p}. Numbers smaller than it gather on the left.`, [lo, hi]);
          for (let j = lo; j < hi; j++) {
            x.c++;
            x.rec({ [i]: 'key', [j]: 'cmp', [hi]: 'pivot' }, 4, `Is ${a[j]} smaller than the pivot ${p}?`, [lo, hi],
              yn(a[j] < p, `Does ${a[j]} join the "smaller than ${p}" group?`,
                `${a[j]} is smaller than ${p}.`, `${a[j]} isn't smaller than ${p}.`));
            if (a[j] < p) {
              if (i !== j) {
                swap(a, i, j); x.w += 2;
                x.rec({ [i]: 'swap', [j]: 'swap', [hi]: 'pivot' }, 4, `Yes. Swap ${a[i]} into the left group.`, [lo, hi]);
              } else {
                x.rec({ [i]: 'key', [hi]: 'pivot' }, 4, `Yes. ${a[i]} is already in the left group.`, [lo, hi]);
              }
              i++;
            }
          }
          if (i !== hi) { swap(a, i, hi); x.w += 2; }
          x.sorted.add(i);
          x.rec({ [i]: 'pivot' }, 5, `The pivot ${p} lands at position ${i}, its final place.`, [lo, hi]);
          qs(lo, i - 1);
          qs(i + 1, hi);
        };
        qs(0, a.length - 1);
      },
    },
  };

  // Runs an algorithm and returns its frames. Exposed for testing.
  function record(algoKey, input) {
    const a = input.slice();
    const x = {
      a, n: a.length, c: 0, w: 0, sorted: new Set(), frames: [],
      rec(marks, line, note, range, q) {
        this.frames.push({ a: a.slice(), m: marks || {}, s: new Set(this.sorted), r: range || null, line, note, c: this.c, w: this.w, q: q || null });
      },
    };
    x.rec({}, -1, 'Press play, or step through with the arrow keys.');
    if (a.length > 1) ALGOS[algoKey].run(x);
    for (let k = 0; k < a.length; k++) x.sorted.add(k);
    x.rec({}, -1, `Sorted! That took ${x.c} comparisons and ${x.w} moves.`);
    return x.frames;
  }

  // ---------- data ----------
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function makeArray(n, shape) {
    if (shape === 'few') {
      const pool = [20, 45, 70, 95];
      return Array.from({ length: n }, () => pool[rnd(0, 3)]);
    }
    const a = Array.from({ length: n }, () => rnd(5, 99));
    if (shape === 'reversed') return a.sort((p, q) => q - p);
    if (shape === 'nearly') {
      a.sort((p, q) => p - q);
      for (let k = 0; k < Math.max(1, Math.round(n / 10)); k++) swap(a, rnd(0, n - 1), rnd(0, n - 1));
    }
    return a;
  }

  function parseCustom(text) {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    if (parts.length < 2) return { error: 'Type at least two numbers, with commas or spaces between them.' };
    if (parts.length > 64) return { error: 'Use 64 numbers or fewer so the bars stay readable.' };
    const out = [];
    for (const p of parts) {
      if (!/^\d+$/.test(p)) return { error: `"${p}" isn't a whole number. Use whole numbers from 1 to 999.` };
      const v = Number(p);
      if (v < 1 || v > 999) return { error: `${v} is too big or too small. Use whole numbers from 1 to 999.` };
      out.push(v);
    }
    return { values: out };
  }

  globalThis.VisuaLearn = { ALGOS, record, makeArray, parseCustom };

  // ---------- player ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const DELAYS = [700, 340, 160, 70, 22];
  const state = {
    algo: 'bubble', input: [], frames: [], i: 0, timer: null,
    predict: true, pending: -1, resume: false, answered: new Map(), right: 0, asked: 0,
  };

  const els = {
    algos: $('algos'), bars: $('bars'), note: $('note'), code: $('code'),
    step: $('st-step'), cmp: $('st-cmp'), w: $('st-w'), score: $('st-score'), scrub: $('scrub'),
    play: $('b-play'), fwd: $('b-fwd'), speed: $('speed'), size: $('size'), sizeOut: $('size-out'), shape: $('shape'),
    name: $('algo-name'), blurb: $('algo-blurb'), cx: $('algo-cx'), table: $('cx-table'),
    form: $('custom'), customIn: $('custom-in'), err: $('custom-err'),
    predict: $('predict'), quiz: $('quiz'), quizQ: $('quiz-q'), quizOpts: $('quiz-opts'), quizFb: $('quiz-fb'), quizSkip: $('quiz-skip'),
    done: $('done'), doneText: $('done-text'),
    offTitle: $('off-title'), offNeed: $('off-need'), offTime: $('off-time'), offSteps: $('off-steps'), offThink: $('off-think'), offAlgo: $('off-algo'),
  };
  let barEls = [];

  function buildAlgoButtons() {
    els.algos.innerHTML = '';
    for (const [key, al] of Object.entries(ALGOS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = al.name;
      b.dataset.algo = key;
      b.addEventListener('click', () => { state.algo = key; prepare(); });
      els.algos.appendChild(b);
    }
    els.table.innerHTML = '';
    for (const [key, al] of Object.entries(ALGOS)) {
      const tr = document.createElement('tr');
      tr.dataset.algo = key;
      for (const v of [al.name, al.cx.best, al.cx.avg, al.cx.worst, al.cx.space, al.cx.stable]) {
        const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
      }
      els.table.appendChild(tr);
    }
  }

  function buildBars(n) {
    els.bars.innerHTML = '';
    els.bars.style.setProperty('--gap', n > 40 ? '2px' : n > 20 ? '3px' : '5px');
    barEls = [];
    const labels = n <= 24;
    for (let k = 0; k < n; k++) {
      const d = document.createElement('div');
      d.className = 'bar';
      if (labels) d.appendChild(document.createElement('span'));
      els.bars.appendChild(d);
      barEls.push(d);
    }
  }

  function renderOffline(al) {
    const o = al.offline;
    els.offAlgo.textContent = al.name;
    els.offTitle.textContent = o.title;
    els.offNeed.textContent = o.need;
    els.offTime.textContent = o.time;
    els.offThink.textContent = o.think;
    els.offSteps.innerHTML = '';
    for (const s of o.steps) { const li = document.createElement('li'); li.textContent = s; els.offSteps.appendChild(li); }
  }

  function prepare() {
    stop();
    const al = ALGOS[state.algo];
    state.frames = record(state.algo, state.input);
    state.i = 0;
    state.pending = -1;
    state.answered = new Map();
    state.right = 0;
    state.asked = 0;
    state.logged = false;
    els.scrub.max = String(state.frames.length - 1);
    els.code.innerHTML = '';
    al.code.forEach((line) => { const li = document.createElement('li'); li.textContent = line; els.code.appendChild(li); });
    els.name.textContent = al.name;
    els.blurb.textContent = al.blurb;
    els.cx.innerHTML = '';
    for (const [k, label] of [['best', 'Best'], ['avg', 'Average'], ['worst', 'Worst'], ['space', 'Memory'], ['stable', 'Stable']]) {
      const div = document.createElement('div');
      div.innerHTML = '<dt></dt><dd></dd>';
      div.firstChild.textContent = label;
      div.lastChild.textContent = al.cx[k];
      els.cx.appendChild(div);
    }
    for (const b of els.algos.children) b.setAttribute('aria-pressed', String(b.dataset.algo === state.algo));
    for (const tr of els.table.children) tr.classList.toggle('on', tr.dataset.algo === state.algo);
    renderOffline(al);
    if (barEls.length !== state.input.length) buildBars(state.input.length);
    render();
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
      els.quizFb.textContent = 'Make a guess, then the bars will show you.';
      els.quizFb.className = 'fb';
    }
  }

  function render() {
    const f = state.frames[state.i];
    const max = Math.max(...state.input, 1);
    for (let k = 0; k < barEls.length; k++) {
      const el = barEls[k];
      const v = f.a[k];
      el.style.height = `${Math.max(2, (v / max) * 100)}%`;
      let cls = 'bar';
      const mark = f.m[k];
      if (mark) cls += ' ' + mark;
      else if (f.s.has(k)) cls += ' done';
      if (f.r && (k < f.r[0] || k > f.r[1]) && !f.s.has(k)) cls += ' dim';
      el.className = cls;
      if (el.firstChild) el.firstChild.textContent = v;
    }
    [...els.code.children].forEach((li, k) => li.classList.toggle('on', k === f.line));
    els.note.textContent = f.note;
    els.step.textContent = `${state.i} / ${state.frames.length - 1}`;
    els.cmp.textContent = f.c;
    els.w.textContent = f.w;
    els.score.textContent = state.asked ? `${state.right} / ${state.asked}` : '–';
    els.scrub.value = String(state.i);
    els.fwd.disabled = state.pending === state.i;
    els.bars.setAttribute('aria-label', `Array: ${f.a.join(', ')}`);
    renderQuiz(f);
    const last = state.i === state.frames.length - 1 && state.frames.length > 1;
    els.done.hidden = !last;
    if (last && !state.logged) { state.logged = true; globalThis.VLProgress?.mark(`sorting:${state.algo}`); }
    if (last) {
      els.doneText.textContent = state.asked
        ? `You guessed ${state.right} of ${state.asked} right. Now try it for real, away from the screen.`
        : 'Now try it for real, away from the screen.';
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
      // Hand keyboard focus to the answers if it was on the play controls, so Enter answers.
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
      state.timer = setTimeout(tick, result === 'wrong' ? 1800 : 1000);
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
    if (state.pending === state.i) { // a question is waiting: answering is how you continue
      state.resume = true;
      els.quizOpts.querySelector('button')?.focus({ preventScroll: true });
      return;
    }
    if (state.timer) stop(); else play();
  }
  const step = (d) => { stop(); if (d > 0 && state.pending === state.i) return; go(state.i + d); };

  function newArray() {
    state.input = makeArray(Number(els.size.value), els.shape.value);
    els.err.textContent = '';
    prepare();
  }

  // ---------- wiring ----------
  els.play.addEventListener('click', toggle);
  $('b-back').addEventListener('click', () => step(-1));
  els.fwd.addEventListener('click', () => step(1));
  $('b-reset').addEventListener('click', () => { stop(); go(0); });
  $('b-new').addEventListener('click', newArray);
  els.quizSkip.addEventListener('click', () => answer(-1));
  els.predict.addEventListener('change', () => {
    state.predict = els.predict.checked;
    if (!state.predict && state.pending === state.i) { state.pending = -1; if (state.resume) { state.resume = false; play(); } }
    render();
  });
  els.scrub.addEventListener('input', () => {
    stop();
    // Scrubbing is for looking around, so it never stops to ask.
    state.i = Number(els.scrub.value);
    state.pending = -1;
    render();
  });
  els.size.addEventListener('input', () => { els.sizeOut.textContent = els.size.value; newArray(); });
  els.shape.addEventListener('change', newArray);
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = parseCustom(els.customIn.value);
    if (res.error) { els.err.textContent = res.error; return; }
    els.err.textContent = '';
    state.input = res.values;
    els.size.value = String(Math.max(5, Math.min(64, res.values.length)));
    els.sizeOut.textContent = String(res.values.length);
    prepare();
  });
  $('b-print').addEventListener('click', () => window.print());
  document.addEventListener('vl:rest', stop);
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && ((t.tagName === 'INPUT' && t.type !== 'range' && t.type !== 'checkbox') || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (document.body.classList.contains('resting')) return;
    if (state.pending === state.i && (e.key === '1' || e.key === '2')) { answer(Number(e.key) - 1); return; }
    if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && t.type !== 'range') step(1);
    else if (e.key === 'ArrowLeft' && t.type !== 'range') step(-1);
    else if (e.key === 'Home') { stop(); go(0); }
  });

  buildAlgoButtons();
  newArray();
})();
