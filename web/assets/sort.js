/* VisuaLearn sorting visualiser.
   Each algorithm runs once, up front, on a copy of the array and records a frame after every step.
   The player only renders frames, so stepping backwards is free. */
(() => {
  'use strict';

  const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };

  // ---------- algorithms ----------
  const ALGOS = {
    bubble: {
      name: 'Bubble sort',
      blurb: 'Walk the list, swapping neighbours that are out of order. Each pass carries the largest remaining value to the end, like a bubble rising.',
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
      run(x) {
        const { a, n } = x;
        for (let i = 0; i < n - 1; i++) {
          let swapped = false;
          x.rec({}, 0, `Pass ${i + 1}: carry the largest unsorted value to the right.`);
          for (let j = 0; j < n - 1 - i; j++) {
            x.c++;
            x.rec({ [j]: 'cmp', [j + 1]: 'cmp' }, 3, `Is ${a[j]} bigger than ${a[j + 1]}?`);
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
      blurb: 'Scan the unsorted part for its smallest value and move it to the front. It always makes the same number of comparisons, but very few swaps.',
      cx: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'No' },
      code: [
        'for i = 0 … n−2',
        '  min ← i',
        '  for j = i+1 … n−1',
        '    if a[j] < a[min]: min ← j',
        '  swap a[i], a[min]',
        '  a[i] is in place',
      ],
      run(x) {
        const { a, n } = x;
        for (let i = 0; i < n - 1; i++) {
          let min = i;
          x.rec({ [i]: 'key' }, 1, `Start by assuming ${a[i]} is the smallest of what's left.`, [i, n - 1]);
          for (let j = i + 1; j < n; j++) {
            x.c++;
            x.rec({ [min]: 'key', [j]: 'cmp' }, 3, `Is ${a[j]} smaller than ${a[min]}?`, [i, n - 1]);
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
      blurb: 'Grow a sorted part on the left. Take the next value and slide it left until it fits, the way most people sort a hand of cards. Very fast on lists that are nearly sorted.',
      cx: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: 'Yes' },
      code: [
        'for i = 1 … n−1',
        '  key ← a[i]',
        '  while left neighbour > key',
        '    shift neighbour right; key moves left',
        '  key is placed',
      ],
      run(x) {
        const { a, n } = x;
        for (let i = 1; i < n; i++) {
          const key = a[i];
          let j = i;
          x.rec({ [i]: 'key' }, 1, `Take ${key} and insert it into the sorted part on its left.`, [0, i]);
          while (j > 0) {
            x.c++;
            x.rec({ [j - 1]: 'cmp', [j]: 'key' }, 2, `Is ${a[j - 1]} bigger than ${key}?`, [0, i]);
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
      blurb: 'Split the list in half until each piece has one item, then merge the pieces back together in order. Always O(n log n), at the cost of a second array.',
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
            x.rec({ [k]: 'cmp' }, 4, `Compare the fronts: ${L[i]} (left) and ${R[j]} (right).`, [lo, hi]);
            if (L[i] <= R[j]) put(L[i++], 5, `${L[i - 1]} is smaller or equal. Write it at position ${k}.`);
            else put(R[j++], 5, `${R[j - 1]} is smaller. Write it at position ${k}.`);
          }
          while (i < L.length) put(L[i++], 6, `Copy leftover ${L[i - 1]} from the left half.`);
          while (j < R.length) put(R[j++], 6, `Copy leftover ${R[j - 1]} from the right half.`);
        };
        ms(0, n - 1);
      },
    },

    quick: {
      name: 'Quick sort',
      blurb: 'Pick a pivot, move everything smaller to its left, and the pivot lands in its final spot. Repeat on each side. Usually the fastest in practice, but a bad pivot choice makes it O(n²).',
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
          x.rec({ [hi]: 'pivot' }, 2, `Pivot is ${p}. Values smaller than it will gather on the left.`, [lo, hi]);
          for (let j = lo; j < hi; j++) {
            x.c++;
            x.rec({ [i]: 'key', [j]: 'cmp', [hi]: 'pivot' }, 4, `Is ${a[j]} smaller than the pivot ${p}?`, [lo, hi]);
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
          x.rec({ [i]: 'pivot' }, 5, `Pivot ${p} lands at position ${i}, its final place.`, [lo, hi]);
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
      rec(marks, line, note, range) {
        this.frames.push({ a: a.slice(), m: marks || {}, s: new Set(this.sorted), r: range || null, line, note, c: this.c, w: this.w });
      },
    };
    x.rec({}, -1, 'Press play, or step through with the arrow keys.');
    if (a.length > 1) ALGOS[algoKey].run(x);
    for (let k = 0; k < a.length; k++) x.sorted.add(k);
    x.rec({}, -1, `Sorted. ${x.c} comparisons and ${x.w} array writes.`);
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
    if (parts.length < 2) return { error: 'Enter at least two numbers, separated by commas or spaces.' };
    if (parts.length > 64) return { error: 'Use 64 numbers or fewer so the bars stay readable.' };
    const out = [];
    for (const p of parts) {
      if (!/^\d+$/.test(p)) return { error: `"${p}" isn't a whole number. Use whole numbers from 1 to 999.` };
      const v = Number(p);
      if (v < 1 || v > 999) return { error: `${v} is out of range. Use whole numbers from 1 to 999.` };
      out.push(v);
    }
    return { values: out };
  }

  globalThis.VisuaLearn = { ALGOS, record, makeArray, parseCustom };

  // ---------- player ----------
  if (typeof document === 'undefined') return;
  const $ = (id) => document.getElementById(id);
  const DELAYS = [700, 340, 160, 70, 22];
  const state = { algo: 'bubble', input: [], frames: [], i: 0, timer: null };

  const els = {
    algos: $('algos'), bars: $('bars'), note: $('note'), code: $('code'),
    step: $('st-step'), cmp: $('st-cmp'), w: $('st-w'), scrub: $('scrub'),
    play: $('b-play'), speed: $('speed'), size: $('size'), sizeOut: $('size-out'), shape: $('shape'),
    name: $('algo-name'), blurb: $('algo-blurb'), cx: $('algo-cx'), table: $('cx-table'),
    form: $('custom'), customIn: $('custom-in'), err: $('custom-err'),
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

  function prepare() {
    stop();
    const al = ALGOS[state.algo];
    state.frames = record(state.algo, state.input);
    state.i = 0;
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
    if (barEls.length !== state.input.length) buildBars(state.input.length);
    render();
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
    els.scrub.value = String(state.i);
    els.bars.setAttribute('aria-label', `Array: ${f.a.join(', ')}`);
  }

  function go(i) {
    state.i = Math.max(0, Math.min(state.frames.length - 1, i));
    render();
  }

  function setPlayIcon(playing) {
    els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    els.play.querySelector('svg').innerHTML = playing
      ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'
      : '<path d="M7 5v14l12-7z"/>';
  }

  function tick() {
    if (state.i >= state.frames.length - 1) { stop(); return; }
    go(state.i + 1);
    state.timer = setTimeout(tick, DELAYS[Number(els.speed.value) - 1]);
  }
  function play() {
    if (state.timer) return;
    if (state.i >= state.frames.length - 1) go(0);
    setPlayIcon(true);
    state.timer = setTimeout(tick, 0);
  }
  function stop() {
    clearTimeout(state.timer);
    state.timer = null;
    setPlayIcon(false);
  }
  const toggle = () => (state.timer ? stop() : play());

  function newArray() {
    state.input = makeArray(Number(els.size.value), els.shape.value);
    els.err.textContent = '';
    prepare();
  }

  // ---------- wiring ----------
  els.play.addEventListener('click', toggle);
  $('b-back').addEventListener('click', () => { stop(); go(state.i - 1); });
  $('b-fwd').addEventListener('click', () => { stop(); go(state.i + 1); });
  $('b-reset').addEventListener('click', () => { stop(); go(0); });
  $('b-new').addEventListener('click', newArray);
  els.scrub.addEventListener('input', () => { stop(); go(Number(els.scrub.value)); });
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
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' && t.type !== 'range' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === ' ' && t.tagName !== 'BUTTON') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && t.type !== 'range') { stop(); go(state.i + 1); }
    else if (e.key === 'ArrowLeft' && t.type !== 'range') { stop(); go(state.i - 1); }
    else if (e.key === 'Home') { stop(); go(0); }
  });

  buildAlgoButtons();
  newArray();
})();
